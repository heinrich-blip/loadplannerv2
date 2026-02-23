import { MainLayout } from "@/components/layout/MainLayout";
import { TripHistoryDialog } from "@/components/tracking/TripHistoryDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getActiveLoadsForTracking,
  type ActiveLoadForTracking,
} from "@/lib/api";
import { calculateDistance, DEPOTS } from "@/lib/depots";
import { formatDistance } from "@/lib/waypoints";
import { useCustomLocations } from "@/hooks/useCustomLocations";
import { calculateRoadDistance, decodePolyline } from "@/lib/routing";
import {
  authenticate,
  clearAuth,
  formatLastConnected,
  getAssetsWithPositions,
  getGeofences,
  getStatusColor,
  isAuthenticated,
  type TelematicsAsset,
  type TelematicsGeofence,
} from "@/lib/telematicsGuru";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertCircle,
  Clock,
  History,
  Loader2,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Route,
  Settings,
  Target,
  Truck,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
}

function calculateETA(
  vehicle: TelematicsAsset,
  geofence: TelematicsGeofence,
): {
  eta: Date | null;
  etaFormatted: string;
  distance: number;
  distanceFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  speed: number;
  isMoving: boolean;
} {
  const vehicleLat = vehicle.lastLatitude;
  const vehicleLng = vehicle.lastLongitude;
  const geofenceLat =
    geofence.latitude ?? geofence.centerLatitude ?? geofence.lat;
  const geofenceLng =
    geofence.longitude ?? geofence.centerLongitude ?? geofence.lng;

  if (!vehicleLat || !vehicleLng || !geofenceLat || !geofenceLng) {
    return {
      eta: null,
      etaFormatted: "N/A",
      distance: 0,
      distanceFormatted: "N/A",
      durationMinutes: 0,
      durationFormatted: "N/A",
      speed: vehicle.speedKmH || 0,
      isMoving: (vehicle.speedKmH || 0) > 0 || vehicle.inTrip,
    };
  }

  const distance = calculateDistance(
    vehicleLat,
    vehicleLng,
    geofenceLat,
    geofenceLng,
  );
  const distanceFormatted = formatDistance(distance);
  const speed = vehicle.speedKmH || 0;
  const isMoving = speed > 0 || vehicle.inTrip;
  const effectiveSpeed = isMoving ? Math.max(speed, 20) : 50;
  const durationMinutes = (distance / effectiveSpeed) * 60;
  const durationFormatted = formatDuration(durationMinutes);
  const now = new Date();
  const eta = new Date(now.getTime() + durationMinutes * 60000);
  const etaFormatted = eta.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    eta,
    etaFormatted,
    distance,
    distanceFormatted,
    durationMinutes,
    durationFormatted,
    speed: vehicle.speedKmH || 0,
    isMoving,
  };
}

function createVehicleIcon(
  asset: TelematicsAsset,
  hasActiveLoad = false,
): L.DivIcon {
  const isStationary = asset.speedKmH < 5 && !asset.inTrip;
  const color = isStationary ? "#ef4444" : getStatusColor(asset);
  const rotation = asset.heading || 0;
  const fleetNumber = asset.name || asset.code || `${asset.id}`;
  const displayNumber =
    fleetNumber.length > 8 ? fleetNumber.substring(0, 7) + "…" : fleetNumber;

  const loadIndicator = hasActiveLoad
    ? `
    <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#7c3aed;color:white;font-size:8px;padding:1px 4px;border-radius:4px;white-space:nowrap;font-weight:bold;border:1px solid white;">
      LOAD
    </div>
  `
    : "";

  const statusIndicator = asset.inTrip
    ? `<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white;animation:pulse 1.5s infinite;"></div>`
    : "";

  const iconContent = isStationary
    ? ""
    : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L12 22M12 2L5 9M12 2L19 9"/>
      </svg>`;

  const fleetLabel = `
    <div style="position:absolute;top:30px;left:50%;transform:translateX(-50%);background:white;color:#1e293b;font-size:10px;padding:2px 8px;border-radius:4px;white-space:nowrap;font-weight:700;letter-spacing:0.2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);border:1.5px solid ${color};">
      ${displayNumber}
    </div>
  `;

  return L.divIcon({
    html: `
      <div style="width:80px;height:${hasActiveLoad ? "70px" : "55px"};position:relative;display:flex;align-items:flex-start;justify-content:center;padding-top:0;overflow:visible;">
        <div style="
          width:28px;height:28px;border-radius:50%;background:${color};
          border:3px solid ${hasActiveLoad ? "#7c3aed" : "white"};display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);${isStationary ? "" : `transform:rotate(${rotation}deg);`}
        ">
          ${iconContent}
        </div>
        ${statusIndicator}
        ${fleetLabel}
        ${loadIndicator}
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}</style>
    `,
    className: "vehicle-marker",
    iconSize: [80, hasActiveLoad ? 70 : 55],
    iconAnchor: [40, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ assets }: { assets: TelematicsAsset[] }) {
  const map = useMap();

  useEffect(() => {
    // Guard: ensure map is fully initialized before calling fitBounds
    if (!map || !map.getContainer()) return;
    
    // Use a small delay to ensure map is ready ( Leaflet needs time to initialize)
    const timeoutId = setTimeout(() => {
      if (assets.length === 0) return;

      const validAssets = assets.filter(
        (a) => a.lastLatitude !== null && a.lastLongitude !== null,
      );
      if (validAssets.length === 0) return;

      try {
        const bounds = L.latLngBounds(
          validAssets.map((a) => [a.lastLatitude!, a.lastLongitude!]),
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (error) {
        console.warn('FitBounds error:', error);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [assets, map]);

  return null;
}

export default function LiveTrackingPage() {
  const [assets, setAssets] = useState<TelematicsAsset[]>([]);
  const [activeLoads, setActiveLoads] = useState<ActiveLoadForTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [_refreshInterval, _setRefreshInterval] = useState(10);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [_showLoadsPanel, _setShowLoadsPanel] = useState(true);
  const [geofences, setGeofences] = useState<TelematicsGeofence[]>([]);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [_showCustomLocations] = useState(true);
  const { data: customLocations = [] } = useCustomLocations();
  const [maximizeMap, setMaximizeMap] = useState(false);
  const [showRouteCalculator, setShowRouteCalculator] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<number | null>(
    null,
  );
  const [etaResult, setEtaResult] = useState<{
    eta: Date | null;
    etaFormatted: string;
    distance: number;
    distanceFormatted: string;
    durationMinutes: number;
    durationFormatted: string;
    speed: number;
    isMoving: boolean;
  } | null>(null);

  // Trip history dialog state
  const [tripHistoryAsset, setTripHistoryAsset] = useState<TelematicsAsset | null>(null);
  const [tripHistoryLoads, setTripHistoryLoads] = useState<Record<string, unknown>[]>([]);

  // Auth form state
  const [username, setUsername] = useState(
    localStorage.getItem("tg_username") || "",
  );
  const [password, setPassword] = useState("");
  const [organisationId, setOrganisationId] = useState(
    localStorage.getItem("telematics_org_id") || "4002",
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("tg_remember") === "true",
  );

  // Auto-authenticate on mount
  useEffect(() => {
    const autoLogin = async () => {
      if (isAuthenticated()) {
        setAuthenticated(true);
        return;
      }

      const savedUsername = localStorage.getItem("tg_username");
      const savedPassword = localStorage.getItem("tg_password");
      const savedRemember = localStorage.getItem("tg_remember") === "true";

      if (savedRemember && savedUsername && savedPassword) {
        setAuthLoading(true);
        const success = await authenticate(savedUsername, atob(savedPassword));
        if (success) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem("tg_password");
          localStorage.removeItem("tg_remember");
          setRememberMe(false);
          setShowAuthDialog(true);
        }
        setAuthLoading(false);
      } else if (!isAuthenticated()) {
        setShowAuthDialog(true);
      }
    };

    autoLogin();
  }, []);

  const fetchAssets = useCallback(async () => {
    if (!authenticated || !organisationId) return;

    setLoading(true);
    setError(null);

    try {
      const [telematicsData, loadsResponse, geofenceData] = await Promise.all([
        getAssetsWithPositions(parseInt(organisationId)),
        getActiveLoadsForTracking().catch(() => ({
          data: { activeLoads: [] },
        })),
        getGeofences(parseInt(organisationId)).catch(() => []),
      ]);

      setAssets(telematicsData);
      setActiveLoads(loadsResponse.data?.activeLoads || []);
      setGeofences(geofenceData || []);
      setLastRefresh(new Date());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch vehicles";
      setError(message);
      toast.error(message);
      if (message.includes("Authentication") || message.includes("expired")) {
        setAuthenticated(false);
        setShowAuthDialog(true);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, organisationId]);

  const assetToLoadMap = useMemo(() => {
    const map = new Map<string | number, ActiveLoadForTracking>();
    activeLoads.forEach((load) => {
      if (load.vehicle?.telematicsAssetId) {
        map.set(load.vehicle.telematicsAssetId, load);
      }
      if (load.vehicle?.registration) {
        map.set(load.vehicle.registration.toLowerCase(), load);
      }
    });
    return map;
  }, [activeLoads]);

  const getLoadForAsset = useCallback(
    (asset: TelematicsAsset): ActiveLoadForTracking | null => {
      if (assetToLoadMap.has(asset.id)) {
        return assetToLoadMap.get(asset.id)!;
      }
      const assetName = (asset.name || asset.code || "").toLowerCase();
      if (assetName && assetToLoadMap.has(assetName)) {
        return assetToLoadMap.get(assetName)!;
      }
      return null;
    },
    [assetToLoadMap],
  );

  // Open trip history for a vehicle
  const openTripHistory = useCallback(async (asset: TelematicsAsset) => {
    setTripHistoryAsset(asset);
    // Fetch loads linked to this vehicle via fleet_vehicles.telematics_asset_id or registration match
    try {
      const assetName = (asset.name || asset.code || "").toLowerCase();
      const { data } = await supabase
        .from("loads")
        .select(`
          id, load_id, origin, destination, status, loading_date, offloading_date,
          actual_loading_arrival, actual_loading_arrival_source, actual_loading_arrival_verified,
          actual_loading_departure, actual_loading_departure_source, actual_loading_departure_verified,
          actual_offloading_arrival, actual_offloading_arrival_source, actual_offloading_arrival_verified,
          actual_offloading_departure, actual_offloading_departure_source, actual_offloading_departure_verified,
          fleet_vehicle:fleet_vehicles(id, vehicle_id, telematics_asset_id)
        `)
        .order("loading_date", { ascending: false })
        .limit(20);
      
      // Filter loads that match this asset
      const vehicleLoads = (data || []).filter((load) => {
        const fv = load.fleet_vehicle as { telematics_asset_id?: string | null; vehicle_id?: string } | null;
        if (fv?.telematics_asset_id && String(fv.telematics_asset_id) === String(asset.id)) return true;
        if (fv?.vehicle_id && fv.vehicle_id.toLowerCase() === assetName) return true;
        return false;
      });
      setTripHistoryLoads(vehicleLoads as Record<string, unknown>[]);
    } catch {
      setTripHistoryLoads([]);
    }
  }, []);

  const selectedVehicle = useMemo(
    () => assets.find((a) => a.id === selectedVehicleId),
    [assets, selectedVehicleId],
  );

  const selectedGeofence = useMemo(
    () => geofences.find((g) => g.id === selectedGeofenceId),
    [geofences, selectedGeofenceId],
  );

  // Calculate ETA when vehicle and geofence are selected
  useEffect(() => {
    if (!selectedVehicle || !selectedGeofence) {
      setEtaResult(null);
      return;
    }

    const result = calculateETA(selectedVehicle, selectedGeofence);
    setEtaResult(result);
  }, [selectedVehicle, selectedGeofence]);

  const handleAuth = async () => {
    if (!username || !password || !organisationId) return;

    setAuthLoading(true);
    setError(null);

    const success = await authenticate(username, password);

    if (success) {
      localStorage.setItem("telematics_org_id", organisationId);
      localStorage.setItem("tg_username", username);

      if (rememberMe) {
        localStorage.setItem("tg_password", btoa(password));
        localStorage.setItem("tg_remember", "true");
      } else {
        localStorage.removeItem("tg_password");
        localStorage.removeItem("tg_remember");
      }

      setAuthenticated(true);
      setShowAuthDialog(false);
      setPassword("");
      toast.success("Connected to Telematics Guru");
    } else {
      setError("Invalid credentials");
      toast.error("Invalid credentials");
    }

    setAuthLoading(false);
  };

  const handleLogout = () => {
    clearAuth();
    setAuthenticated(false);
    setAssets([]);
    setUsername("");
    setOrganisationId("");
    setRememberMe(false);
    localStorage.removeItem("telematics_org_id");
    localStorage.removeItem("tg_username");
    localStorage.removeItem("tg_password");
    localStorage.removeItem("tg_remember");
    toast.success("Disconnected from Telematics");
  };

  // Initial fetch when authenticated
  useEffect(() => {
    if (authenticated && organisationId) {
      fetchAssets();
    }
  }, [authenticated, organisationId, fetchAssets]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !authenticated) return;

    const intervalId = setInterval(fetchAssets, _refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, authenticated, _refreshInterval, fetchAssets]);

  // Fetch road route when vehicle or destination geofence changes
  useEffect(() => {
    const fetchRoute = async () => {
      if (!selectedVehicle?.lastLatitude || !selectedVehicle?.lastLongitude || !selectedGeofence) {
        setRouteCoords([]);
        return;
      }

      const destLat = selectedGeofence.centerLatitude ?? selectedGeofence.latitude ?? selectedGeofence.lat;
      const destLng = selectedGeofence.centerLongitude ?? selectedGeofence.longitude ?? selectedGeofence.lng;

      if (!destLat || !destLng) {
        setRouteCoords([]);
        return;
      }

      try {
        const result = await calculateRoadDistance(
          selectedVehicle.lastLatitude,
          selectedVehicle.lastLongitude,
          destLat,
          destLng
        );

        if (result.geometry) {
          const coords = decodePolyline(result.geometry);
          setRouteCoords(coords);
        } else {
          setRouteCoords([
            [selectedVehicle.lastLatitude, selectedVehicle.lastLongitude],
            [destLat, destLng]
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch road route:', err);
        if (destLat && destLng) {
          setRouteCoords([
            [selectedVehicle.lastLatitude, selectedVehicle.lastLongitude],
            [destLat, destLng]
          ]);
        }
      }
    };

    fetchRoute();
  }, [selectedVehicle, selectedGeofence]);

  const stats = useMemo(() => {
    const moving = assets.filter((a) => a.speedKmH >= 5 || a.inTrip).length;
    const stationary = assets.filter((a) => a.speedKmH < 5 && !a.inTrip).length;
    const offline = assets.filter((a) => {
      if (!a.lastConnectedUtc) return true;
      return Date.now() - new Date(a.lastConnectedUtc).getTime() > 3600000;
    }).length;

    return { total: assets.length, moving, stationary, offline };
  }, [assets]);

  const defaultCenter: [number, number] = [-19.0, 31.0];

  return (
    <MainLayout title="Live Tracking">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Live Vehicle Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Real-time fleet positions from Telematics Guru
            </p>
          </div>
          <div className="flex items-center gap-2">
            {authenticated ? (
              <>
                <Button
                  variant="outline"
                  onClick={fetchAssets}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSettingsDialog(true)}
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuthDialog(true)}>
                <Truck className="w-4 h-4 mr-2" />
                Connect to Telematics
              </Button>
            )}
          </div>
        </div>

        {authenticated && !maximizeMap && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Truck className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vehicles</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moving</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.moving}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stationary</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.stationary}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Loads</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {activeLoads.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 bg-muted rounded-lg">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {stats.offline}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {authenticated && geofences.length > 0 && !maximizeMap && (
          <Card className="border-indigo-200 dark:border-indigo-800">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Route className="w-5 h-5 text-indigo-600" />
                Route & ETA Calculator
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRouteCalculator(!showRouteCalculator)}
              >
                {showRouteCalculator ? "Hide" : "Show"}
              </Button>
            </CardHeader>
            {showRouteCalculator && (
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-select" className="text-sm font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Select Vehicle
                    </Label>
                    <select
                      id="vehicle-select"
                      title="Select vehicle for ETA"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={selectedVehicleId || ""}
                      onChange={(e) =>
                        setSelectedVehicleId(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">Choose a vehicle...</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name || asset.code || `Vehicle ${asset.id}`}
                          {asset.speedKmH > 0
                            ? ` (${asset.speedKmH} km/h)`
                            : " (Stationary)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geofence-select" className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Destination Geofence
                    </Label>
                    <select
                      id="geofence-select"
                      title="Select destination geofence"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={selectedGeofenceId || ""}
                      onChange={(e) =>
                        setSelectedGeofenceId(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">Choose a destination...</option>
                      {geofences.map((geofence) => (
                        <option key={geofence.id} value={geofence.id}>
                          {geofence.name}
                          {geofence.description
                            ? ` - ${geofence.description}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {etaResult && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Estimated Arrival
                        </Label>
                        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {etaResult.etaFormatted}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {etaResult.durationFormatted}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Navigation className="w-4 h-4" />
                          Distance & Speed
                        </Label>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {etaResult.distanceFormatted}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {etaResult.isMoving
                              ? `Moving at ${Math.round(etaResult.speed)} km/h`
                              : "Vehicle stationary"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {(!selectedVehicleId || !selectedGeofenceId) && (
                    <div className="md:col-span-2 flex items-center justify-center p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Select a vehicle and destination to calculate ETA
                      </p>
                    </div>
                  )}
                </div>

                {(selectedVehicleId || selectedGeofenceId) && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVehicleId(null);
                        setSelectedGeofenceId(null);
                        setEtaResult(null);
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Fleet Map
            </CardTitle>
            <div className="flex items-center gap-4">
              <Button
                variant={maximizeMap ? "default" : "outline"}
                size="sm"
                onClick={() => setMaximizeMap((v) => !v)}
                className="gap-2"
              >
                {maximizeMap ? "Exit Full Screen" : "Full Screen"}
              </Button>
              <Button
                variant={showDepots ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDepots(!showDepots)}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                Depots ({DEPOTS.length})
              </Button>
              {authenticated && geofences.length > 0 && (
                <Button
                  variant={showGeofences ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGeofences(!showGeofences)}
                  className="gap-2"
                >
                  <Target className="w-4 h-4" />
                  Geofences ({geofences.length})
                </Button>
              )}
              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                  {autoRefresh && ` • Auto-refresh: ${_refreshInterval}s`}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!authenticated ? (
              <div className="h-[500px] flex flex-col items-center justify-center bg-muted/30 rounded-b-lg">
                <Truck className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Connect to Telematics Guru</p>
                <p className="text-muted-foreground mb-4">Sign in to view your fleet&apos;s live positions</p>
                <Button onClick={() => setShowAuthDialog(true)}>
                  <Truck className="w-4 h-4 mr-2" />
                  Connect Now
                </Button>
              </div>
            ) : loading && assets.length === 0 ? (
              <div className={`${maximizeMap ? "h-[calc(100vh-160px)]" : "h-[500px]"} flex items-center justify-center`}>
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className={`${maximizeMap ? "h-[calc(100vh-160px)]" : "h-[500px]"} rounded-b-lg overflow-hidden`}>
                <MapContainer
                  center={defaultCenter}
                  zoom={7}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                  />

                  {showGeofences &&
                    geofences.map((geofence) => {
                      const lat = geofence.latitude ?? geofence.centerLatitude ?? geofence.lat;
                      const lng = geofence.longitude ?? geofence.centerLongitude ?? geofence.lng;
                      const radius = geofence.radius || 500;
                      if (!lat || !lng) return null;
                      return (
                        <Circle
                          key={geofence.id}
                          center={[lat, lng]}
                          radius={radius}
                          pathOptions={{ color: "#8b5cf6", fillColor: "#8b5cf6", fillOpacity: 0.15, weight: 2 }}
                        >
                          <Tooltip permanent={false} direction="top">
                            <div className="font-semibold">{geofence.name}</div>
                            {geofence.description && <div className="text-xs text-gray-500">{geofence.description}</div>}
                          </Tooltip>
                        </Circle>
                      );
                    })}

                  {showDepots &&
                    DEPOTS.map((depot) => {
                      const depotIcon = L.divIcon({
                        className: "depot-marker",
                        html: `<div style="background: ${depot.type === 'depot' ? '#059669' : depot.type === 'warehouse' ? '#0284c7' : depot.type === 'market' ? '#dc2626' : '#9333ea'}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10"/><path d="M2 10.6L12 2l10 8.6"/></svg></div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                      });
                      return (
                        <React.Fragment key={depot.id}>
                          <Circle
                            center={[depot.latitude, depot.longitude]}
                            radius={depot.radius}
                            pathOptions={{ color: depot.type === 'depot' ? '#059669' : '#9333ea', fillColor: depot.type === 'depot' ? '#059669' : '#9333ea', fillOpacity: 0.2, weight: 2, dashArray: '5, 5' }}
                          />
                          <Marker position={[depot.latitude, depot.longitude]} icon={depotIcon}>
                            <Popup>
                              <div className="p-1">
                                <div className="font-bold text-base">{depot.name}</div>
                                <div className="text-sm text-gray-600">{depot.type.charAt(0).toUpperCase() + depot.type.slice(1)} • {depot.country}</div>
                              </div>
                            </Popup>
                          </Marker>
                        </React.Fragment>
                      );
                    })}

                  {_showCustomLocations &&
                    customLocations.map((loc) => {
                      const locIcon = L.divIcon({
                        className: "custom-location-marker",
                        html: `<div style="background: #f97316; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                        iconSize: [26, 26],
                        iconAnchor: [13, 13],
                      });
                      return (
                        <React.Fragment key={loc.id}>
                          <Circle
                            center={[Number(loc.latitude), Number(loc.longitude)]}
                            radius={loc.radius || 500}
                            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.2, weight: 2, dashArray: '5, 5' }}
                          />
                          <Marker position={[Number(loc.latitude), Number(loc.longitude)]} icon={locIcon}>
                            <Popup><div className="font-bold">{loc.name}</div></Popup>
                          </Marker>
                        </React.Fragment>
                      );
                    })}

                  {routeCoords.length > 0 && (
                    <Polyline positions={routeCoords} pathOptions={{ color: "#4f46e5", weight: 4, opacity: 0.8 }}>
                      <Tooltip permanent direction="center">
                        <div className="text-xs font-medium">
                          {etaResult ? (
                            <>
                              <div>{etaResult.distanceFormatted}</div>
                              <div className="text-indigo-600">ETA: {etaResult.etaFormatted}</div>
                            </>
                          ) : "Calculating..."}
                        </div>
                      </Tooltip>
                    </Polyline>
                  )}

                  {assets.map((asset) => {
                    const load = getLoadForAsset(asset);
                    if (asset.lastLatitude === null || asset.lastLongitude === null) return null;
                    return (
                      <Marker
                        key={asset.id}
                        position={[asset.lastLatitude, asset.lastLongitude]}
                        icon={createVehicleIcon(asset, !!load)}
                      >
                        <Popup>
                          <div className="min-w-[220px]">
                            <div className="font-bold text-lg mb-2">{asset.name || asset.code || `Vehicle ${asset.id}`}</div>
                            {load && (
                              <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-semibold text-sm mb-1">
                                  <Package className="w-4 h-4" /> Active Delivery
                                </div>
                                <div className="text-xs space-y-1">
                                  <div><span className="font-medium">Load:</span> {load.load_id}</div>
                                  <div><span className="font-medium">To:</span> {load.destination || "N/A"}</div>
                                </div>
                              </div>
                            )}
                            <div className="space-y-1 text-sm">
                              <div><span className="font-medium">Speed:</span> {Math.round(asset.speedKmH)} km/h</div>
                              <div><span className="font-medium">Last seen:</span> {formatLastConnected(asset.lastConnectedUtc)}</div>
                              <button
                                onClick={() => openTripHistory(asset)}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium"
                              >
                                <History className="h-3 w-3" /> Trip History
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                  <FitBounds assets={assets} />
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {authenticated && assets.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Vehicle List</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {assets.map((asset) => {
                  const load = getLoadForAsset(asset);
                  return (
                    <div
                      key={asset.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors ${load ? "border-purple-300 bg-purple-50/50" : ""}`}
                      onClick={() => openTripHistory(asset)}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(asset) }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name || asset.code}</p>
                        <p className="text-sm text-muted-foreground">{Math.round(asset.speedKmH)} km/h</p>
                      </div>
                      <button 
                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                        aria-label={`View trip history for ${asset.name || asset.code}`}
                      >
                        <History className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect to Telematics Guru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
                <Label htmlFor="rememberMe" className="text-sm font-medium cursor-pointer">Remember me</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancel</Button>
              <Button onClick={handleAuth} disabled={authLoading}>
                {authLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                {authLoading ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tracking Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              <div className="pt-4 border-t">
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                  Disconnect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TripHistoryDialog
          open={!!tripHistoryAsset}
          onOpenChange={(open) => { if (!open) { setTripHistoryAsset(null); setTripHistoryLoads([]); } }}
          asset={tripHistoryAsset}
          activeLoad={tripHistoryAsset ? getLoadForAsset(tripHistoryAsset) : null}
          vehicleLoads={tripHistoryLoads as never[]}
          organisationId={organisationId ? parseInt(organisationId) : null}
        />
      </div>
    </MainLayout>
  );
}