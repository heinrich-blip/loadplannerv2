import {
  customLocationToDepot,
  findDepotByName,
  isWithinDepot,
} from "@/lib/depots";
import {
  authenticate,
  formatLastConnected,
  getAssetsWithPositions,
  getOrganisations,
  isAuthenticated,
  type TelematicsAsset,
} from "@/lib/telematicsGuru";
import { useCustomLocations } from "@/hooks/useCustomLocations";
import {
  useGeofenceLoadUpdate,
  useLoads,
  type Load,
  type GeofenceEventType,
} from "@/hooks/useLoads";
import { useAuth } from "@/hooks/useAuth";
import { parseISO } from "date-fns";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface LoadWithAsset extends Load {
  telematicsAsset?: TelematicsAsset | null;
  isAtLoadOrigin?: boolean;
  lastUpdate?: string;
}

interface GeofenceMonitorContextType {
  telematicsAssets: TelematicsAsset[];
  telematicsLoading: boolean;
  telematicsAuthError: boolean;
  lastRefresh: Date | null;
  loadsWithAssets: LoadWithAsset[];
  refetch: () => void;
  setDeliveryCompleteCallback?: (callback: (load: Load) => void) => void;
}

const GeofenceMonitorContext = createContext<GeofenceMonitorContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function GeofenceMonitorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: loads = [] } = useLoads();
  const { data: customLocations = [] } = useCustomLocations();

  const extraDepots = useMemo(
    () => customLocations.map(customLocationToDepot),
    [customLocations]
  );

  const [telematicsAssets, setTelematicsAssets] = useState<TelematicsAsset[]>([]);
  const [telematicsLoading, setTelematicsLoading] = useState(false);
  const [telematicsAuthError, setTelematicsAuthError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Geofence tracking refs
  const previousPositionsRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());
  const processedEventsRef = useRef<Set<string>>(new Set());
  const geofenceEntryRef = useRef<Map<string, Date>>(new Map());
  const stationaryTrackingRef = useRef<Map<string, { entryTime: Date; stationaryStartTime: Date | null }>>(new Map());
  const insideCountRef = useRef<Map<string, number>>(new Map());
  const geofenceUpdateMutation = useGeofenceLoadUpdate();

  const [organisationId, setOrganisationId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("telematics_org_id");
    return stored ? parseInt(stored) : null;
  });

  // Callback to trigger delivery confirmation dialog - stored in ref for use in effect
  const onDeliveryCompleteRef = useRef<((load: Load) => void) | undefined>(undefined);

  // Check if there are any active loads to monitor
  const hasActiveLoads = useMemo(() => {
    return loads.some((l) => l.status === "scheduled" || l.status === "in-transit");
  }, [loads]);

  // Fetch telematics data
  const fetchTelematicsData = useCallback(async () => {
    if (!isAuthenticated()) {
      const username = localStorage.getItem("telematics_username");
      const password = localStorage.getItem("telematics_password");
      if (username && password) {
        const success = await authenticate(username, password);
        if (!success) {
          setTelematicsAuthError(true);
          return;
        }
        setTelematicsAuthError(false);
      } else {
        setTelematicsAuthError(true);
        return;
      }
    }

    setTelematicsLoading(true);
    try {
      let orgId = organisationId;
      if (!orgId) {
        const orgs = await getOrganisations();
        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id;
          setOrganisationId(orgId);
          localStorage.setItem("telematics_org_id", orgId.toString());
        } else {
          setTelematicsAuthError(true);
          return;
        }
      }

      const assets = await getAssetsWithPositions(orgId);
      setTelematicsAssets(assets || []);
      setLastRefresh(new Date());
      setTelematicsAuthError(false);
    } catch (error) {
      console.error("Failed to fetch telematics data:", error);
      if (error instanceof Error && error.message.includes("Authentication")) {
        setTelematicsAuthError(true);
        localStorage.removeItem("telematics_username");
        localStorage.removeItem("telematics_password");
        localStorage.removeItem("telematics_org_id");
        setOrganisationId(null);
      }
    } finally {
      setTelematicsLoading(false);
    }
  }, [organisationId]);

  // Poll telematics every 10 seconds when user is logged in and there are active loads
  useEffect(() => {
    if (!user || !hasActiveLoads) return;

    fetchTelematicsData();
    const interval = setInterval(fetchTelematicsData, 10000);
    return () => clearInterval(interval);
  }, [fetchTelematicsData, user, hasActiveLoads]);

  // Match loads to telematics assets
  const loadsWithAssets: LoadWithAsset[] = useMemo(() => {
    return loads.map((load) => {
      const vehicle = load.fleet_vehicle;
      const telematicsAssetId = vehicle?.telematics_asset_id;
      let telematicsAsset: TelematicsAsset | null = null;

      if (telematicsAssetId) {
        telematicsAsset =
          telematicsAssets.find(
            (a) =>
              a.id.toString() === telematicsAssetId ||
              a.assetId?.toString() === telematicsAssetId ||
              a.registrationNumber === vehicle?.vehicle_id
          ) || null;
      }
      if (!telematicsAsset && vehicle) {
        telematicsAsset =
          telematicsAssets.find(
            (a) =>
              a.registrationNumber === vehicle.vehicle_id ||
              a.displayName?.includes(vehicle.vehicle_id)
          ) || null;
      }

      const originDepot = findDepotByName(load.origin, extraDepots);
      let isAtLoadOrigin = false;
      if (originDepot && telematicsAsset?.lastLatitude && telematicsAsset?.lastLongitude) {
        isAtLoadOrigin = isWithinDepot(
          telematicsAsset.lastLatitude,
          telematicsAsset.lastLongitude,
          originDepot
        );
      }

      return {
        ...load,
        telematicsAsset,
        isAtLoadOrigin,
        lastUpdate: telematicsAsset?.lastConnectedUtc
          ? formatLastConnected(telematicsAsset.lastConnectedUtc)
          : undefined,
      };
    });
  }, [loads, telematicsAssets, extraDepots]);

  // Geofence checking effect
  useEffect(() => {
    // Include pending loads that have fleet and driver assigned - they can be auto-transitioned to scheduled
    const activeLoads = loadsWithAssets.filter(
      (l) => l.status === "pending" || l.status === "scheduled" || l.status === "in-transit"
    );

    // Track which vehicles we have updated in this tick to prevent loop state contamination
    const updatedVehiclesInTick = new Set<string>();

    for (const load of activeLoads) {
      // Gate: Only process the earliest NOT-DELIVERED load for each vehicle.
      const gateVehicleId = load.fleet_vehicle?.vehicle_id || "unassigned";
      if (gateVehicleId !== "unassigned") {
        const notDeliveredForVehicle = loadsWithAssets
          .filter((l) => (l.fleet_vehicle?.vehicle_id || "unassigned") === gateVehicleId && l.status !== "delivered")
          .sort((a, b) => parseISO(a.loading_date).getTime() - parseISO(b.loading_date).getTime());
        const earliestNotDelivered = notDeliveredForVehicle[0];
        if (earliestNotDelivered && earliestNotDelivered.id !== load.id) {
          continue;
        }
      }

      const asset = load.telematicsAsset;
      if (!asset?.lastLatitude || !asset?.lastLongitude) continue;

      const vehicleKey = asset.id?.toString() || asset.registrationNumber || "";
      if (!vehicleKey) continue;

      const previousPos = previousPositionsRef.current.get(vehicleKey);
      const currentPos = { lat: asset.lastLatitude, lon: asset.lastLongitude };

      const originDepot = findDepotByName(load.origin, extraDepots);
      const destinationDepot = findDepotByName(load.destination, extraDepots);

      if (originDepot && destinationDepot) {
        const originInsideRaw = isWithinDepot(currentPos.lat, currentPos.lon, originDepot);
        const destInsideRaw = isWithinDepot(currentPos.lat, currentPos.lon, destinationDepot);

        const originKeyForHyst = `${vehicleKey}-${originDepot.name}-origin`;
        const destKeyForHyst = `${vehicleKey}-${destinationDepot.name}-dest`;

        const requiresHysteresis = (depotName: string, depotType: string) => {
          const isCBC = depotName.toLowerCase() === 'cbc';
          const isDepotType = depotType === 'depot';
          return isCBC || isDepotType;
        };

        const applyHysteresis = (key: string, rawInside: boolean, enabled: boolean) => {
          if (!enabled) return rawInside;
          const current = insideCountRef.current.get(key) || 0;
          if (rawInside) {
            const next = current + 1;
            insideCountRef.current.set(key, next);
            return next >= 2;
          } else {
            insideCountRef.current.set(key, 0);
            return false;
          }
        };

        const isAtOrigin = applyHysteresis(originKeyForHyst, originInsideRaw, requiresHysteresis(originDepot.name, originDepot.type));
        const isAtDestination = applyHysteresis(destKeyForHyst, destInsideRaw, requiresHysteresis(destinationDepot.name, destinationDepot.type));

        const wasAtOrigin = previousPos
          ? isWithinDepot(previousPos.lat, previousPos.lon, originDepot)
          : null;
        const wasAtDestination = previousPos
          ? isWithinDepot(previousPos.lat, previousPos.lon, destinationDepot)
          : null;

        const timestamp = new Date();
        const dateKey = timestamp.toISOString().slice(0, 10);
        const originEntryKey = `${load.id}-origin-entry`;
        const destEntryKey = `${load.id}-dest-entry`;

        const eventCtx = {
          vehicleRegistration: load.fleet_vehicle?.vehicle_id || asset.registrationNumber || asset.name || "",
          telematicsAssetId: String(asset.id),
          loadNumber: load.load_id,
          latitude: currentPos.lat,
          longitude: currentPos.lon,
        };

        // === ORIGIN GEOFENCE ===
        // Handle pending loads: transition to scheduled when vehicle enters origin with fleet+driver
        if (load.status === "pending") {
          const hasFleetAndDriver = load.fleet_vehicle_id && load.driver_id;
          const justEnteredOrigin =
            (wasAtOrigin === false && isAtOrigin === true) ||
            (wasAtOrigin === null && isAtOrigin === true);
          
          // Auto-transition to scheduled when vehicle enters origin (if fleet+driver assigned)
          if (hasFleetAndDriver && justEnteredOrigin && !geofenceEntryRef.current.has(originEntryKey)) {
            geofenceEntryRef.current.set(originEntryKey, timestamp);
            const scheduledEventKey = `${load.id}-pending-scheduled-${dateKey}`;
            if (!processedEventsRef.current.has(scheduledEventKey)) {
              processedEventsRef.current.add(scheduledEventKey);
              // Update status to scheduled
              geofenceUpdateMutation.mutate({
                loadId: load.id,
                eventType: "loading_arrival" as GeofenceEventType,
                timestamp,
                ...eventCtx,
                geofenceName: originDepot.name,
              });
            }
          }
          continue; // Skip further processing for pending loads
        }

        if (load.status === "scheduled") {
          const justEnteredOrigin =
            (wasAtOrigin === false && isAtOrigin === true) ||
            (wasAtOrigin === null && isAtOrigin === true);

          if (justEnteredOrigin && !geofenceEntryRef.current.has(originEntryKey)) {
            geofenceEntryRef.current.set(originEntryKey, timestamp);
            const arrivalEventKey = `${load.id}-loading_arrival-${dateKey}`;
            if (!processedEventsRef.current.has(arrivalEventKey) && !load.actual_loading_arrival) {
              geofenceUpdateMutation.mutate({
                loadId: load.id,
                eventType: "loading_arrival" as GeofenceEventType,
                timestamp,
                ...eventCtx,
                geofenceName: originDepot.name,
              });
              processedEventsRef.current.add(arrivalEventKey);
            }
          }
        }

        if (load.status === "scheduled" && wasAtOrigin === true && isAtOrigin === false) {
          const entryTime = geofenceEntryRef.current.get(originEntryKey);
          if (entryTime) {
            if (!load.actual_loading_arrival) {
              const eventKey = `${load.id}-loading_arrival-${dateKey}`;
              if (!processedEventsRef.current.has(eventKey)) {
                processedEventsRef.current.add(eventKey);
                geofenceUpdateMutation.mutate({
                  loadId: load.id,
                  eventType: "loading_arrival" as GeofenceEventType,
                  timestamp,
                  ...eventCtx,
                  geofenceName: originDepot.name,
                });
              }
            } else if (!load.actual_loading_departure) {
              const eventKey = `${load.id}-loading_departure-${dateKey}`;
              if (!processedEventsRef.current.has(eventKey)) {
                processedEventsRef.current.add(eventKey);
                geofenceUpdateMutation.mutate({
                  loadId: load.id,
                  eventType: "loading_departure" as GeofenceEventType,
                  timestamp,
                  ...eventCtx,
                  geofenceName: originDepot.name,
                });
              }
            }
            geofenceEntryRef.current.delete(originEntryKey);
          }
        }

        // === DESTINATION GEOFENCE ===
        if (load.status === "in-transit") {
          const justEnteredDest =
            (wasAtDestination === false && isAtDestination === true) ||
            (wasAtDestination === null && isAtDestination === true);

          if (justEnteredDest && !geofenceEntryRef.current.has(destEntryKey)) {
            geofenceEntryRef.current.set(destEntryKey, timestamp);
            stationaryTrackingRef.current.set(destEntryKey, { entryTime: timestamp, stationaryStartTime: null });
            const destArrivalEventKey = `${load.id}-offloading_arrival-${dateKey}`;
            if (!processedEventsRef.current.has(destArrivalEventKey) && !load.actual_offloading_arrival) {
              geofenceUpdateMutation.mutate({
                loadId: load.id,
                eventType: "offloading_arrival" as GeofenceEventType,
                timestamp,
                ...eventCtx,
                geofenceName: destinationDepot.name,
              });
              processedEventsRef.current.add(destArrivalEventKey);
            }
          }
        }

        if (load.status === "in-transit" && isAtDestination) {
          const tracking = stationaryTrackingRef.current.get(destEntryKey);
          if (tracking) {
            const isStationary = (asset.speedKmH ?? 0) < 1;
            if (isStationary) {
              if (!tracking.stationaryStartTime) {
                stationaryTrackingRef.current.set(destEntryKey, { ...tracking, stationaryStartTime: timestamp });
              } else {
                const stationaryDurationMs = timestamp.getTime() - tracking.stationaryStartTime.getTime();
                const stationaryDurationMinutes = stationaryDurationMs / (1000 * 60);

                if (stationaryDurationMinutes >= 5 && !load.actual_offloading_arrival) {
                  const eventKey = `${load.id}-offloading_arrival-stationary-${dateKey}`;
                  if (!processedEventsRef.current.has(eventKey) && !processedEventsRef.current.has(`${load.id}-offloading_arrival-${dateKey}`)) {
                    processedEventsRef.current.add(eventKey);
                    geofenceUpdateMutation.mutate({
                      loadId: load.id,
                      eventType: "offloading_arrival" as GeofenceEventType,
                      timestamp,
                      ...eventCtx,
                      geofenceName: destinationDepot.name,
                    });
                  }
                }
              }
            } else if (tracking.stationaryStartTime) {
              stationaryTrackingRef.current.set(destEntryKey, { ...tracking, stationaryStartTime: null });
            }
          }
        }

        if (load.status === "in-transit" && wasAtDestination === true && isAtDestination === false) {
          const entryTime = geofenceEntryRef.current.get(destEntryKey);
          if (entryTime) {
            if (!load.actual_offloading_arrival) {
              const eventKey = `${load.id}-offloading_arrival-${dateKey}`;
              if (!processedEventsRef.current.has(eventKey)) {
                processedEventsRef.current.add(eventKey);
                geofenceUpdateMutation.mutate({
                  loadId: load.id,
                  eventType: "offloading_arrival" as GeofenceEventType,
                  timestamp,
                  ...eventCtx,
                  geofenceName: destinationDepot.name,
                });
              }
            } else if (!load.actual_offloading_departure) {
              const eventKey = `${load.id}-offloading_departure-${dateKey}`;
              if (!processedEventsRef.current.has(eventKey)) {
                processedEventsRef.current.add(eventKey);
                geofenceUpdateMutation.mutate({
                  loadId: load.id,
                  eventType: "offloading_departure" as GeofenceEventType,
                  timestamp,
                  ...eventCtx,
                  geofenceName: destinationDepot.name,
                  onDeliveryComplete: () => {
                    if (onDeliveryCompleteRef.current) {
                      onDeliveryCompleteRef.current(load);
                    }
                  },
                });
                
                geofenceEntryRef.current.delete(originEntryKey);
                geofenceEntryRef.current.delete(destEntryKey);
                stationaryTrackingRef.current.delete(destEntryKey);
                insideCountRef.current.delete(originKeyForHyst);
                insideCountRef.current.delete(destKeyForHyst);
                
                const keysToDelete: string[] = [];
                processedEventsRef.current.forEach((k) => {
                  if (k.startsWith(`${load.id}-`)) keysToDelete.push(k);
                });
                keysToDelete.forEach((k) => processedEventsRef.current.delete(k));
              }
            }
            geofenceEntryRef.current.delete(destEntryKey);
            stationaryTrackingRef.current.delete(destEntryKey);
          }
        }
      }

      // Update position for the vehicle, but only if we haven't already processed it for another load in this tick
      if (!updatedVehiclesInTick.has(vehicleKey)) {
        previousPositionsRef.current.set(vehicleKey, currentPos);
        updatedVehiclesInTick.add(vehicleKey);
      }
    }
  }, [loadsWithAssets, geofenceUpdateMutation, extraDepots]);

  const contextValue = useMemo<GeofenceMonitorContextType>(
    () => ({
      telematicsAssets,
      telematicsLoading,
      telematicsAuthError,
      lastRefresh,
      loadsWithAssets,
      refetch: fetchTelematicsData,
      setDeliveryCompleteCallback: (callback: (load: Load) => void) => {
        onDeliveryCompleteRef.current = callback;
      },
    }),
    [telematicsAssets, telematicsLoading, telematicsAuthError, lastRefresh, loadsWithAssets, fetchTelematicsData]
  );

  return (
    <GeofenceMonitorContext.Provider value={contextValue}>
      {children}
    </GeofenceMonitorContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useGeofenceMonitor() {
  const context = useContext(GeofenceMonitorContext);
  if (context === undefined) {
    throw new Error("useGeofenceMonitor must be used within a GeofenceMonitorProvider");
  }
  return context;
}