import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientActiveLoads } from '@/hooks/useClientLoads';
import type { Load } from '@/hooks/useLoads';
import { calculateDistance, DEPOTS, customLocationToDepot, type Depot } from '@/lib/depots';
import { formatDistance } from '@/lib/waypoints';
import { useCustomLocations } from '@/hooks/useCustomLocations';
import { calculateRoadDistance, decodePolyline } from '@/lib/routing';
import {
  formatLastConnected,
  getAssetsForPortal,
  getStatusColor,
  type TelematicsAsset,
} from '@/lib/telematicsGuru';
import { getLocationDisplayName } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  Clock,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createVehicleIcon(
  asset: TelematicsAsset,
  isSelected: boolean = false,
): L.DivIcon {
  const isStationary = asset.speedKmH < 5 && !asset.inTrip;
  const color = isStationary ? '#ef4444' : getStatusColor(asset);
  const rotation = asset.heading || 0;
  const fleetNumber = asset.name || asset.code || `${asset.id}`;
  const displayNumber =
    fleetNumber.length > 8 ? fleetNumber.substring(0, 7) + '…' : fleetNumber;

  // Add selection indicator
  const selectionRing = isSelected
    ? `<div style="position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px;border-radius:50%;border:3px solid #7c3aed;animation:pulse 1.5s infinite;"></div>`
    : '';

  const loadIndicator = `
    <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#7c3aed;color:white;font-size:8px;padding:1px 4px;border-radius:4px;white-space:nowrap;font-weight:bold;border:1px solid white;">
      LOAD
    </div>
  `;

  const statusIndicator = asset.inTrip
    ? `<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white;animation:pulse 1.5s infinite;"></div>`
    : '';

  const iconContent = isStationary
    ? ''
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
      <div style="width:80px;height:70px;position:relative;display:flex;align-items:flex-start;justify-content:center;padding-top:0;overflow:visible;">
        ${selectionRing}
        <div style="
          width:28px;height:28px;border-radius:50%;background:${color};
          border:3px solid #7c3aed;display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);${isStationary ? '' : `transform:rotate(${rotation}deg);`}
        ">
          ${iconContent}
        </div>
        ${statusIndicator}
        ${fleetLabel}
        ${loadIndicator}
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}</style>
    `,
    className: 'vehicle-marker',
    iconSize: [80, 70],
    iconAnchor: [40, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ assets, loads, allDepots }: { assets: TelematicsAsset[]; loads: Load[]; allDepots: Depot[] }) {
  const map = useMap();

  useEffect(() => {
    // Guard: ensure map is fully initialized before calling fitBounds
    if (!map || !map.getContainer()) return;

    const points: [number, number][] = [];

    // Add vehicle positions
    assets.forEach((a) => {
      if (a.lastLatitude !== null && a.lastLongitude !== null) {
        points.push([a.lastLatitude, a.lastLongitude]);
      }
    });

    // Add origin/destination depot locations
    loads.forEach((load) => {
      const originName = getLocationDisplayName(load.origin);
      const destName = getLocationDisplayName(load.destination);
      const originDepot = allDepots.find((d) => d.name === originName);
      const destDepot = allDepots.find((d) => d.name === destName);
      if (originDepot) points.push([originDepot.latitude, originDepot.longitude]);
      if (destDepot) points.push([destDepot.latitude, destDepot.longitude]);
    });

    if (points.length === 0) return;

    try {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } catch (error) {
      console.warn('FitBounds error:', error);
    }
  }, [assets, loads, map, allDepots]);

  return null;
}

// Component to fetch and render road-following route line
function RoadRoutePolyline({
  originLat,
  originLng,
  destLat,
  destLng,
  isSelected = false,
}: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  isSelected?: boolean;
}) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const result = await calculateRoadDistance(originLat, originLng, destLat, destLng);
        if (result.geometry) {
          const coords = decodePolyline(result.geometry);
          setRouteCoords(coords);
        } else {
          // Fallback to straight line
          setRouteCoords([[originLat, originLng], [destLat, destLng]]);
        }
      } catch (err) {
        console.error('Failed to fetch road route:', err);
        // Fallback to straight line
        setRouteCoords([[originLat, originLng], [destLat, destLng]]);
      }
    };
    fetchRoute();
  }, [originLat, originLng, destLat, destLng]);

  if (routeCoords.length === 0) return null;

  return (
    <Polyline
      positions={routeCoords}
      pathOptions={{ 
        color: isSelected ? "#7c3aed" : "#ef4444", 
        weight: isSelected ? 5 : 3, 
        opacity: isSelected ? 0.9 : 0.5,
        dashArray: isSelected ? undefined : "5, 5"
      }}
    />
  );
}

export default function ClientLiveMapPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: loads = [], isLoading: loadsLoading } = useClientActiveLoads(clientId);
  const { data: customLocations = [] } = useCustomLocations();

  // State for selected vehicle
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const extraDepots = useMemo(
    () => customLocations.map(customLocationToDepot),
    [customLocations]
  );
  const allDepots = useMemo(() => [...DEPOTS, ...extraDepots], [extraDepots]);

  const [telematicsAssets, setTelematicsAssets] = useState<TelematicsAsset[]>([]);
  const [telematicsLoading, setTelematicsLoading] = useState(false);
  const [telematicsError, setTelematicsError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchTelematicsData = useCallback(async () => {
    setTelematicsLoading(true);
    try {
      const assets = await getAssetsForPortal();
      if (assets) {
        setTelematicsAssets(assets);
        setLastRefresh(new Date());
        setTelematicsError(false);
      } else {
        setTelematicsError(true);
      }
    } catch (error) {
      console.error('Failed to fetch telematics data:', error);
      setTelematicsError(true);
    } finally {
      setTelematicsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelematicsData();
    const interval = setInterval(fetchTelematicsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTelematicsData]);

  // Match loads to telematics assets
  const matchedLoads = useMemo(() => {
    return loads.map((load) => {
      const vehicleId = load.fleet_vehicle?.telematics_asset_id;
      const asset = vehicleId
        ? telematicsAssets.find((a) => 
            a.id.toString() === vehicleId.toString() || 
            a.code === vehicleId
          )
        : null;
      return { load, asset };
    });
  }, [loads, telematicsAssets]);

  // Only in-transit loads appear on the map
  const inTransitMatchedLoads = useMemo(
    () => matchedLoads.filter(({ load }) => load.status === 'in-transit'),
    [matchedLoads]
  );

  // Get unique depots for in-transit loads (shown on map)
  const relevantDepots = useMemo(() => {
    const depotNames = new Set<string>();
    inTransitMatchedLoads.forEach(({ load }) => {
      const originName = getLocationDisplayName(load.origin);
      const destName = getLocationDisplayName(load.destination);
      depotNames.add(originName);
      depotNames.add(destName);
    });
    return allDepots.filter((d) => depotNames.has(d.name));
  }, [inTransitMatchedLoads, allDepots]);

  // In-transit vehicles with GPS positions (for map markers)
  const inTransitTrackedVehicles = inTransitMatchedLoads.filter(
    (m) => m.asset && m.asset.lastLatitude && m.asset.lastLongitude
  );

  const isLoading = loadsLoading || telematicsLoading;

  // Handle vehicle selection
  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(prevId => prevId === vehicleId ? null : vehicleId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            Live Tracking
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time location of your active shipments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              Updated {formatLastConnected(lastRefresh.toISOString())}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTelematicsData}
            disabled={telematicsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${telematicsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              {loads.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              {loads.filter((l) => l.status === 'in-transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              {loads.filter((l) => l.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked (In Transit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-500" />
              {inTransitTrackedVehicles.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Selection Bar - only in-transit vehicles */}
      {inTransitTrackedVehicles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground px-2 py-1">
            Select vehicle to show route:
          </span>
          {inTransitTrackedVehicles.map(({ load, asset }) => (
            <Button
              key={load.id}
              variant={selectedVehicleId === asset?.id.toString() ? "default" : "outline"}
              size="sm"
              onClick={() => asset && handleVehicleSelect(asset.id.toString())}
              className={cn(
                "gap-2",
                selectedVehicleId === asset?.id.toString() && "bg-purple-600 hover:bg-purple-700"
              )}
            >
              <Truck className="h-3 w-3" />
              {load.fleet_vehicle?.vehicle_id || `Vehicle ${asset?.id}`}
            </Button>
          ))}
          {selectedVehicleId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVehicleId(null)}
              className="ml-auto"
            >
              Clear Selection
            </Button>
          )}
        </div>
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="w-full h-[350px] sm:h-[500px]" />
          ) : telematicsError ? (
            <div className="w-full h-[350px] sm:h-[500px] flex items-center justify-center bg-muted/50">
              <div className="text-center px-4">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Unable to load tracking data</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchTelematicsData}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : inTransitMatchedLoads.length === 0 ? (
            <div className="w-full h-[350px] sm:h-[500px] flex items-center justify-center bg-muted/50">
              <div className="text-center px-4">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No in-transit loads to track</p>
                <p className="text-sm text-muted-foreground mt-1">
                  In-transit shipments will appear here in real-time
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[350px] sm:h-[500px]">
            <MapContainer
              center={[-19.5, 30.5]}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds
                assets={inTransitTrackedVehicles.map((t) => t.asset!)}
                loads={inTransitMatchedLoads.map((t) => t.load)}
                allDepots={allDepots}
              />

              {/* Depot Markers */}
              {relevantDepots.map((depot) => (
                <Circle
                  key={depot.id}
                  center={[depot.latitude, depot.longitude]}
                  radius={depot.radius}
                  pathOptions={{
                    color: '#7c3aed',
                    fillColor: '#7c3aed',
                    fillOpacity: 0.1,
                  }}
                >
                  <Tooltip permanent direction="bottom" offset={[0, 10]}>
                    <span className="font-medium">{depot.name}</span>
                  </Tooltip>
                </Circle>
              ))}

              {/* Vehicle Markers - only in-transit */}
              {inTransitTrackedVehicles.map(({ load, asset }) => {
                if (!asset || !asset.lastLatitude || !asset.lastLongitude) return null;

                const destName = getLocationDisplayName(load.destination);
                const destDepot = allDepots.find((d) => d.name === destName);
                const isSelected = selectedVehicleId === asset.id.toString();
                
                let distanceToDestination = '';
                if (destDepot) {
                  const dist = calculateDistance(
                    asset.lastLatitude,
                    asset.lastLongitude,
                    destDepot.latitude,
                    destDepot.longitude
                  );
                  distanceToDestination = formatDistance(dist);
                }

                return (
                  <React.Fragment key={load.id}>
                    <Marker
                      position={[asset.lastLatitude, asset.lastLongitude]}
                      icon={createVehicleIcon(asset, isSelected)}
                      eventHandlers={{
                        click: () => handleVehicleSelect(asset.id.toString())
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <div className="font-semibold text-lg mb-2">
                            {load.fleet_vehicle?.vehicle_id || 'Vehicle'}
                          </div>
                          <div className="space-y-2 text-sm">
                            {/* Load ID */}
                            <div>
                              <span className="text-muted-foreground">Load:</span>{' '}
                              <span className="font-medium">{load.load_id}</span>
                            </div>
                            
                            {/* Origin */}
                            <div>
                              <span className="text-muted-foreground">From:</span>{' '}
                              <span>{getLocationDisplayName(load.origin)}</span>
                            </div>
                            
                            {/* Destination */}
                            <div>
                              <span className="text-muted-foreground">To:</span>{' '}
                              <span>{getLocationDisplayName(load.destination)}</span>
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge
                                variant={
                                  load.status === 'in-transit'
                                    ? 'default'
                                    : load.status === 'delivered'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {load.status}
                              </Badge>
                            </div>
                            
                            {/* Speed */}
                            <div>
                              <span className="text-muted-foreground">Speed:</span>{' '}
                              <span>{asset.speedKmH} km/h</span>
                            </div>
                            
                            {/* Distance to destination */}
                            {distanceToDestination && (
                              <div>
                                <span className="text-muted-foreground">Distance to destination:</span>{' '}
                                <span className="font-medium">{distanceToDestination}</span>
                              </div>
                            )}
                            
                            {/* Last updated */}
                            {asset.lastConnectedUtc && (
                              <div>
                                <span className="text-muted-foreground">Updated:</span>{' '}
                                <span>{formatLastConnected(asset.lastConnectedUtc)}</span>
                              </div>
                            )}
                            
                            {/* Show route button in popup */}
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className="w-full mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVehicleSelect(asset.id.toString());
                              }}
                            >
                              {isSelected ? "Hide Route" : "Show Route"}
                            </Button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Road-following route line - only show if selected */}
                    {destDepot && isSelected && (
                      <RoadRoutePolyline
                        originLat={asset.lastLatitude}
                        originLng={asset.lastLongitude}
                        destLat={destDepot.latitude}
                        destLng={destDepot.longitude}
                        isSelected={true}
                      />
                    )}
                    
                    {/* Optionally show faint routes for all vehicles when none selected */}
                    {destDepot && !selectedVehicleId && (
                      <RoadRoutePolyline
                        originLat={asset.lastLatitude}
                        originLng={asset.lastLongitude}
                        destLat={destDepot.latitude}
                        destLng={destDepot.longitude}
                        isSelected={false}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Loads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Active Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : loads.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No active shipments</div>
          ) : (
            <div className="divide-y">
              {matchedLoads.map(({ load, asset }) => (
                <div 
                  key={load.id} 
                  className={cn(
                    "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer hover:bg-muted/50 px-2 rounded-lg transition-colors",
                    selectedVehicleId === asset?.id.toString() && "bg-purple-50 dark:bg-purple-950/20 border-l-4 border-purple-500"
                  )}
                  onClick={() => asset && handleVehicleSelect(asset.id.toString())}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
                      selectedVehicleId === asset?.id.toString() 
                        ? "bg-purple-200 dark:bg-purple-800" 
                        : "bg-purple-100 dark:bg-purple-900/30"
                    )}>
                      <Package className={cn(
                        "h-5 w-5",
                        selectedVehicleId === asset?.id.toString()
                          ? "text-purple-700 dark:text-purple-300"
                          : "text-purple-600 dark:text-purple-400"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{load.load_id}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-13 sm:ml-0 flex-wrap">
                    {load.fleet_vehicle && (
                      <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                        {load.fleet_vehicle.vehicle_id}
                      </span>
                    )}
                    <Badge
                      variant={
                        load.status === 'in-transit'
                          ? 'default'
                          : load.status === 'delivered'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {load.status}
                    </Badge>
                    {asset ? (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "border-green-200",
                          selectedVehicleId === asset.id.toString() 
                            ? "bg-purple-100 text-purple-700 border-purple-200" 
                            : "bg-green-50 text-green-700"
                        )}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        {selectedVehicleId === asset.id.toString() ? "Selected" : "Tracked"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500">
                        No GPS
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}