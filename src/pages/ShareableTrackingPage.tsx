import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getLocationDisplayName, safeFormatDate } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { findDepotByName, customLocationToDepot } from "@/lib/depots";
import { useCustomLocations } from "@/hooks/useCustomLocations";
import { calculateRoadDistance, decodePolyline } from "@/lib/routing";
import { parseTimeWindow, computeTimeVariance, formatTimeAsSAST } from "@/lib/timeWindow";
import { useSearchParams } from "react-router-dom";

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface TelematicsAsset {
  id: number;
  name: string;
  code: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  heading: number | null;
  speedKmH: number;
  inTrip: boolean;
  isEnabled: boolean;
  lastConnectedUtc: string;
}

interface TrackingShareLink {
  id: string;
  token: string;
  load_id: string | null;
  telematics_asset_id: string;
  expires_at: string;
  created_at: string;
  created_by: string | null;
  view_count: number;
  last_viewed_at: string | null;
  load?: {
    load_id: string;
    origin: string;
    destination: string;
    loading_date: string;
    offloading_date: string;
    cargo_type: string;
    status: string;
    time_window: unknown;
    actual_loading_arrival: string | null;
    actual_loading_departure: string | null;
    actual_offloading_arrival: string | null;
    actual_offloading_departure: string | null;
    driver?: { name: string; contact: string } | null;
    fleet_vehicle?: {
      vehicle_id: string;
      type: string;
      telematics_asset_id?: string | null;
    } | null;
  } | null;
}

// Get status color based on asset state
function getStatusColor(asset: TelematicsAsset): string {
  if (!asset.isEnabled) return "#9CA3AF";
  if (asset.inTrip) return "#22C55E";
  if (asset.speedKmH > 0) return "#22C55E";
  return "#3B82F6";
}

// Get heading direction as compass point
function getHeadingDirection(heading: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

// Create vehicle marker icon
function createVehicleIcon(asset: TelematicsAsset): L.DivIcon {
  const color = getStatusColor(asset);
  const rotation = asset.heading || 0;

  // Get fleet number from asset name or code
  const fleetNumber = asset.name || asset.code || `${asset.id}`;
  // Truncate if too long
  const displayNumber =
    fleetNumber.length > 8 ? fleetNumber.substring(0, 7) + "…" : fleetNumber;

  // Fleet number label below the icon - clean professional styling
  const fleetLabel = `
    <div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);background:white;color:#1e293b;font-size:12px;padding:4px 10px;border-radius:5px;white-space:nowrap;font-weight:700;letter-spacing:0.2px;box-shadow:0 2px 4px rgba(0,0,0,0.15);border:2px solid ${color};">
      ${displayNumber}
    </div>
  `;

  return L.divIcon({
    html: `
      <div style="width:100px;height:80px;position:relative;display:flex;align-items:flex-start;justify-content:center;padding-top:0;overflow:visible;">
        <div style="
          width:48px;height:48px;border-radius:50%;background:${color};
          border:4px solid white;display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:rotate(${rotation}deg);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L12 22M12 2L5 9M12 2L19 9"/>
          </svg>
        </div>
        ${
          asset.inTrip
            ? `<div style="position:absolute;top:2px;right:22px;width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid white;animation:pulse 1.5s infinite;"></div>`
            : ""
        }
        ${fleetLabel}
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}</style>
    `,
    className: "vehicle-marker",
    iconSize: [100, 80],
    iconAnchor: [50, 24],
    popupAnchor: [0, -24],
  });
}

// Center map on vehicle
function CenterOnVehicle({ asset }: { asset: TelematicsAsset | null }) {
  const map = useMap();

  useEffect(() => {
    // Guard: ensure map is fully initialized
    if (!map || !map.getContainer()) return;

    if (
      asset?.lastLatitude !== null &&
      asset?.lastLatitude !== undefined &&
      asset?.lastLongitude !== null &&
      asset?.lastLongitude !== undefined
    ) {
      try {
        map.setView([asset.lastLatitude, asset.lastLongitude], 14);
      } catch (error) {
        console.warn('CenterOnVehicle error:', error);
      }
    }
  }, [asset, map]);

  return null;
}

// Format remaining time until expiry
function formatTimeRemaining(expiresAt: string): string {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export default function ShareableTrackingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { data: customLocations = [] } = useCustomLocations();
  const extraDepots = useMemo(
    () => customLocations.map(customLocationToDepot),
    [customLocations]
  );

  const [shareLink, setShareLink] = useState<TrackingShareLink | null>(null);
  const [asset, setAsset] = useState<TelematicsAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Move load declaration here, before any useEffect that uses it
  const load = shareLink?.load;

  // Fetch the share link data
  const fetchShareLink = useCallback(async () => {
    if (!token) {
      setError("No tracking token provided");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("tracking_share_links")
        .select(
          `
          *,
          load:loads(
            load_id,
            origin,
            destination,
            loading_date,
            offloading_date,
            cargo_type,
            status,
            time_window,
            actual_loading_arrival,
            actual_loading_departure,
            actual_offloading_arrival,
            actual_offloading_departure,
            driver:drivers!loads_driver_id_fkey(name, contact),
            fleet_vehicle:fleet_vehicles(vehicle_id, type, telematics_asset_id)
          )
        `,
        )
        .eq("token", token)
        .single();

      if (fetchError) {
        console.error("Error fetching share link:", fetchError);
        setError("Invalid or expired tracking link");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Tracking link not found");
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("This tracking link has expired");
        setLoading(false);
        return;
      }

      setShareLink(data);

      // Update view count
      await supabase
        .from("tracking_share_links")
        .update({
          view_count: (data.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
    } catch (err) {
      console.error("Failed to load tracking data:", err);
      setError("Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch vehicle position from Edge Function
  const fetchVehiclePosition = useCallback(async () => {
    if (!shareLink || !token) {
      return;
    }

    setLoadingVehicle(true);
    setVehicleError(null);

    try {
      // Determine which asset ID to use
      const assetId =
        shareLink.load?.fleet_vehicle?.telematics_asset_id ||
        shareLink.telematics_asset_id;

      if (!assetId) {
        setVehicleError("No vehicle assigned to this tracking link");
        setLoadingVehicle(false);
        return;
      }

      // Call the Edge Function
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error("Missing Supabase configuration");
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/telematics-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: "getAssetByShareToken",
            shareToken: token,
            assetId: assetId,
          }),
        },
      );

      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Invalid response from tracking service");
      }

      if (!response.ok) {
        console.error("Edge Function failed:", response.status, responseData);
        setVehicleError(
          responseData.error || "Failed to fetch vehicle position",
        );
        return;
      }

      // Check if we have valid position data - the Edge Function now returns normalized data
      const hasLatitude = typeof responseData.lastLatitude === "number";
      const hasLongitude = typeof responseData.lastLongitude === "number";

      if (responseData && (hasLatitude || hasLongitude)) {
        // Data is already normalized by the Edge Function
        const normalizedAsset: TelematicsAsset = {
          id: responseData.id ?? parseInt(assetId) ?? 0,
          name:
            responseData.name ||
            shareLink.load?.fleet_vehicle?.vehicle_id ||
            "Vehicle",
          code: responseData.code || `ASSET-${assetId}`,
          lastLatitude: hasLatitude ? responseData.lastLatitude : null,
          lastLongitude: hasLongitude ? responseData.lastLongitude : null,
          heading: responseData.heading ?? 0,
          speedKmH: responseData.speedKmH ?? 0,
          inTrip: responseData.inTrip ?? false,
          isEnabled: responseData.isEnabled ?? true,
          lastConnectedUtc:
            responseData.lastConnectedUtc || new Date().toISOString(),
        };

        setAsset(normalizedAsset);
        setLastUpdate(new Date());
      } else {
        // Still set the asset even without position
        const partialAsset: TelematicsAsset = {
          id: responseData.id ?? parseInt(assetId) ?? 0,
          name:
            responseData.name ||
            shareLink.load?.fleet_vehicle?.vehicle_id ||
            "Vehicle",
          code: responseData.code || `ASSET-${assetId}`,
          lastLatitude: null,
          lastLongitude: null,
          heading: responseData.heading ?? 0,
          speedKmH: responseData.speedKmH ?? 0,
          inTrip: responseData.inTrip ?? false,
          isEnabled: responseData.isEnabled ?? true,
          lastConnectedUtc:
            responseData.lastConnectedUtc || new Date().toISOString(),
        };
        setAsset(partialAsset);
        setVehicleError(
          "GPS position not currently available. Will retry automatically.",
        );
      }
    } catch (err) {
      console.error("Error fetching vehicle position:", err);
      setVehicleError("Failed to connect to tracking service");
    } finally {
      setLoadingVehicle(false);
    }
  }, [shareLink, token]);

  // Initial load
  useEffect(() => {
    fetchShareLink();
  }, [fetchShareLink]);

  // Fetch vehicle position after share link is loaded
  useEffect(() => {
    if (shareLink && !loading) {
      fetchVehiclePosition();
    }
  }, [shareLink, loading, fetchVehiclePosition]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!shareLink || loadingVehicle) return;

    const interval = setInterval(() => {
      fetchVehiclePosition();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [shareLink, loadingVehicle, fetchVehiclePosition]);

  // Fetch road route when vehicle position or destination changes
  useEffect(() => {
    const fetchRoute = async () => {
      if (!asset?.lastLatitude || !asset?.lastLongitude || !load?.destination) {
        setRouteCoords([]);
        return;
      }

      const destDepot = findDepotByName(load.destination, extraDepots);
      if (!destDepot) {
        setRouteCoords([]);
        return;
      }

      try {
        const result = await calculateRoadDistance(
          asset.lastLatitude,
          asset.lastLongitude,
          destDepot.latitude,
          destDepot.longitude,
        );

        if (result.geometry) {
          const coords = decodePolyline(result.geometry);
          setRouteCoords(coords);
        } else {
          // Fallback to straight line if no geometry
          setRouteCoords([
            [asset.lastLatitude, asset.lastLongitude],
            [destDepot.latitude, destDepot.longitude],
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch road route:", err);
        // Fallback to straight line
        setRouteCoords([
          [asset.lastLatitude, asset.lastLongitude],
          [destDepot.latitude, destDepot.longitude],
        ]);
      }
    };

    fetchRoute();
  }, [asset?.lastLatitude, asset?.lastLongitude, load?.destination, extraDepots]);

  const defaultCenter: [number, number] = [-19.0, 31.0]; // Zimbabwe

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Tracking Unavailable
              </h2>
              <p className="text-gray-600">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  Live Vehicle Tracking
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Load: {load?.load_id || "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {shareLink && (
                <span className="text-[10px] sm:text-xs text-orange-600 bg-orange-50 px-1.5 sm:px-2 py-1 rounded hidden sm:inline-flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeRemaining(shareLink.expires_at)}
                </span>
              )}
              {asset && (
                <span className="text-[10px] sm:text-xs text-green-600 bg-green-50 px-1.5 sm:px-2 py-1 rounded hidden sm:inline-flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1 animate-pulse" />
                  Live
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchVehiclePosition}
                disabled={loadingVehicle || !shareLink}
                className="h-8 px-2 sm:px-3"
              >
                {loadingVehicle ? (
                  <Loader2 className="w-4 h-4 sm:mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {load && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="font-medium">From:</span>
                    <span>{getLocationDisplayName(load.origin)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-medium">To:</span>
                    <span>{getLocationDisplayName(load.destination)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Loading:</span>
                    <span>
                      {safeFormatDate(load.loading_date, "dd MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Expected Arrival:</span>
                    <span>
                      {safeFormatDate(load.offloading_date, "dd MMM yyyy")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {load.driver && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Driver:</span>
                      <span>{load.driver.name}</span>
                    </div>
                  )}
                  {load.fleet_vehicle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Vehicle:</span>
                      <span>{load.fleet_vehicle.vehicle_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actual Times & Variances */}
              {(() => {
                const tw = parseTimeWindow(load.time_window);
                const hasAnyActual = load.actual_loading_arrival || load.actual_loading_departure || load.actual_offloading_arrival || load.actual_offloading_departure;
                if (!hasAnyActual) return null;

                const timePoints = [
                  { label: 'Loading Arrival', actual: load.actual_loading_arrival, planned: tw.origin.plannedArrival },
                  { label: 'Loading Departure', actual: load.actual_loading_departure, planned: tw.origin.plannedDeparture },
                  { label: 'Offloading Arrival', actual: load.actual_offloading_arrival, planned: tw.destination.plannedArrival },
                  { label: 'Offloading Departure', actual: load.actual_offloading_departure, planned: tw.destination.plannedDeparture },
                ].filter(tp => tp.actual);

                if (timePoints.length === 0) return null;

                return (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {timePoints.map((tp) => {
                        const v = computeTimeVariance(tp.planned, tp.actual);
                        return (
                          <div key={tp.label} className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500 font-medium">{tp.label}</span>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-900">{formatTimeAsSAST(tp.actual)}</span>
                            </div>
                            {tp.planned && (
                              <span className="text-xs text-gray-400">Planned: {formatTimeAsSAST(tp.planned) || tp.planned}</span>
                            )}
                            {v.diffMin !== null && v.diffMin !== 0 && (
                              v.isLate ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded border ${
                                  v.diffMin > 60
                                    ? 'text-red-700 bg-red-50 border-red-200'
                                    : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                  <ArrowUp className="w-3 h-3" />{v.label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  <ArrowDown className="w-3 h-3" />{v.label}
                                </span>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {asset && (
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStatusColor(asset) }}
                    />
                    <span className="text-sm font-medium">
                      {asset.inTrip ? "In Transit" : "Stationary"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Navigation className="w-4 h-4 inline mr-1" />
                    {asset.speedKmH} km/h •{" "}
                    {getHeadingDirection(asset.heading || 0)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdate && (
                    <span className="text-xs text-gray-500">
                      Last updated: {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                  {shareLink && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Tracking active
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {vehicleError && !asset && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-orange-600">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Vehicle Position Unavailable</p>
                  <p className="text-sm text-gray-500">{vehicleError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchVehiclePosition}
                  disabled={loadingVehicle}
                  className="ml-auto"
                >
                  {loadingVehicle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Retry"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="h-[50vh] sm:h-[60vh] min-h-[300px] sm:min-h-[400px] relative">
            <MapContainer
              center={
                asset?.lastLatitude !== null &&
                asset?.lastLatitude !== undefined &&
                asset?.lastLongitude !== null &&
                asset?.lastLongitude !== undefined
                  ? [asset.lastLatitude, asset.lastLongitude]
                  : defaultCenter
              }
              zoom={
                asset?.lastLatitude !== null &&
                asset?.lastLatitude !== undefined &&
                asset?.lastLongitude !== null &&
                asset?.lastLongitude !== undefined
                  ? 14
                  : 7
              }
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">Carto</a>'
              />

              {asset &&
              asset.lastLatitude !== null &&
              asset.lastLongitude !== null ? (
                <>
                  <Marker
                    position={[asset.lastLatitude, asset.lastLongitude]}
                    icon={createVehicleIcon(asset)}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg mb-2">
                          {asset.name ||
                            load?.fleet_vehicle?.vehicle_id ||
                            "Vehicle"}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <span>
                              {asset.inTrip ? "In Transit" : "Stationary"}
                            </span>
                          </div>
                          {asset.speedKmH > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Speed:</span>
                              <span>{asset.speedKmH} km/h</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Last update:</span>
                            <span>
                              {lastUpdate
                                ? lastUpdate.toLocaleTimeString()
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {routeCoords.length > 0 && (
                    <Polyline
                      positions={routeCoords}
                      pathOptions={{
                        color: "#4f46e5",
                        weight: 4,
                        opacity: 0.8,
                      }}
                    />
                  )}

                  {load?.destination && (() => {
                    const destDepot = findDepotByName(load.destination, extraDepots);
                    if (!destDepot) return null;
                    return (
                      <>
                        <Circle
                          center={[destDepot.latitude, destDepot.longitude]}
                          radius={destDepot.radius || 500}
                          pathOptions={{
                            color: "#059669",
                            fillColor: "#059669",
                            fillOpacity: 0.2,
                            weight: 2,
                          }}
                        />
                        <Marker
                          position={[destDepot.latitude, destDepot.longitude]}
                        >
                          <Tooltip permanent>
                            <span className="text-xs font-medium">
                              {load.destination}
                            </span>
                          </Tooltip>
                        </Marker>
                      </>
                    );
                  })()}
                </>
              ) : null}

              <CenterOnVehicle asset={asset} />
            </MapContainer>
          </div>
        </Card>

        <div className="text-center text-xs text-gray-500 py-4">
          <p>
            This tracking link will expire{" "}
            {shareLink &&
              formatTimeRemaining(shareLink.expires_at).toLowerCase()}
          </p>
          <p className="mt-1">
            Auto-refreshes every 30 seconds • Powered by Telematics Guru
          </p>
        </div>
      </div>
    </div>
  );
}
