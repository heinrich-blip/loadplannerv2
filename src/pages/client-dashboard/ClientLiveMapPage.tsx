// ClientLiveMapPage.tsx - Refined implementation
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientActiveLoads } from '@/hooks/useClientLoads';
import type { Load } from '@/hooks/useLoads';
import { DEPOTS, customLocationToDepot, type Depot } from '@/lib/depots';
import { useCustomLocations } from '@/hooks/useCustomLocations';
import { calculateRoute, decodePolyline } from '@/lib/routing';
import {
  formatLastConnected,
  getAssetsForPortal,
  type TelematicsAsset,
} from '@/lib/telematicsGuru';
import { getLocationDisplayName, cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  Clock,
  Navigation,
  Package,
  RefreshCw,
  Truck,
  Loader2,
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

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Green directional arrow when moving, solid red dot when stopped — with fleet label
function createVehicleIcon(asset: TelematicsAsset, isSelected: boolean = false, fleetNumber?: string): L.DivIcon {
  const heading = asset.heading ?? 0;
  const isMoving = asset.speedKmH > 0;
  const label = fleetNumber || '';
  const labelHtml = label
    ? `<div style="position:absolute;left:50%;transform:translateX(-50%);top:100%;margin-top:2px;white-space:nowrap;background:white;padding:1px 5px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.08);">
        <span style="font-size:9px;font-weight:700;color:#1f2937;letter-spacing:0.02em;">${label}</span>
      </div>`
    : '';

  if (!isMoving) {
    // Stopped: prominent red dot with outer glow
    const dotSize = isSelected ? 28 : 22;
    const dotHalf = dotSize / 2;
    const inner = dotSize - 6;
    return L.divIcon({
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="width:${dotSize}px;height:${dotSize}px;position:relative;">
            ${isSelected ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:2.5px solid #6366f1;opacity:0.5;animation:pulse 2s infinite;"></div>` : ''}
            <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #f87171, #dc2626);border:3px solid white;box-shadow:0 0 0 1px rgba(220,38,38,0.3),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:${inner * 0.35}px;height:${inner * 0.35}px;border-radius:50%;background:rgba(255,255,255,0.5);"></div>
            </div>
          </div>
          ${labelHtml}
        </div>
      `,
      className: 'vehicle-stopped-marker',
      iconSize: [80, dotSize + 18],
      iconAnchor: [40, dotHalf],
    });
  }

  // Moving: larger green circle with crisp white directional arrow
  const size = isSelected ? 42 : 34;
  const half = size / 2;
  const ringColor = isSelected ? '#6366f1' : 'white';
  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="width:${size}px;height:${size}px;position:relative;">
          ${isSelected ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2.5px solid #6366f1;opacity:0.5;animation:pulse 2s infinite;"></div>` : ''}
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
            <defs>
              <radialGradient id="gm${asset.id}" cx="40%" cy="35%">
                <stop offset="0%" stop-color="#4ade80"/>
                <stop offset="100%" stop-color="#16a34a"/>
              </radialGradient>
            </defs>
            <circle cx="${half}" cy="${half}" r="${half - 1.5}" fill="url(#gm${asset.id})" stroke="${ringColor}" stroke-width="2.5"/>
            <g transform="rotate(${heading} ${half} ${half})">
              <polygon points="${half},${half * 0.25} ${half * 0.55},${half * 1.4} ${half},${half * 1.1} ${half * 1.45},${half * 1.4}" fill="white" opacity="0.95"/>
            </g>
          </svg>
        </div>
        ${labelHtml}
      </div>
    `,
    className: 'vehicle-direction-marker',
    iconSize: [80, size + 18],
    iconAnchor: [40, half],
  });
}

// Depot pin icon for route endpoints
function createDepotPinIcon(name: string, type: 'origin' | 'destination'): L.DivIcon {
  const isOrigin = type === 'origin';
  const bg = isOrigin ? '#3b82f6' : '#10b981';
  const letter = isOrigin ? 'A' : 'B';

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:140px;margin-left:-70px;">
        <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${bg};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2.5px solid white;">
          <span style="transform:rotate(45deg);color:white;font-size:12px;font-weight:700;line-height:1;">${letter}</span>
        </div>
        <div style="margin-top:3px;background:white;padding:2px 8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.06);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <span style="font-size:10px;font-weight:600;color:#1f2937;letter-spacing:-0.01em;">${name}</span>
        </div>
      </div>
    `,
    className: 'depot-pin-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 28],
  });
}

function FitBounds({ assets, loads, allDepots }: { assets: TelematicsAsset[]; loads: Load[]; allDepots: Depot[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !map.getContainer()) return;

    const points: [number, number][] = [];

    assets.forEach((a) => {
      if (a.lastLatitude && a.lastLongitude) {
        points.push([a.lastLatitude, a.lastLongitude]);
      }
    });

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

function RoadRoutePolyline({
  waypoints,
  isSelected = false,
}: {
  waypoints: { latitude: number; longitude: number }[];
  isSelected?: boolean;
}) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Create a stable key from waypoints to avoid unnecessary refetches
  const waypointKey = waypoints.map((w) => `${w.latitude.toFixed(4)},${w.longitude.toFixed(4)}`).join('|');

  useEffect(() => {
    if (waypoints.length < 2) return;

    const fetchRoute = async () => {
      try {
        const result = await calculateRoute(waypoints);
        if (result.geometry) {
          const coords = decodePolyline(result.geometry);
          setRouteCoords(coords);
        } else {
          // Fallback: straight lines between waypoints
          setRouteCoords(waypoints.map((w) => [w.latitude, w.longitude] as [number, number]));
        }
      } catch (err) {
        console.error('Failed to fetch road route:', err);
        setRouteCoords(waypoints.map((w) => [w.latitude, w.longitude] as [number, number]));
      }
    };
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointKey]);

  if (routeCoords.length === 0) return null;

  return (
    <Polyline
      positions={routeCoords}
      pathOptions={{ 
        color: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--primary)/0.2)', 
        weight: isSelected ? 3 : 2, 
        opacity: isSelected ? 0.8 : 0.4,
        dashArray: isSelected ? undefined : '5, 5'
      }}
    />
  );
}

export default function ClientLiveMapPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: loads = [], isLoading: loadsLoading } = useClientActiveLoads(clientId);
  const { data: customLocations = [] } = useCustomLocations();

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
    const interval = setInterval(fetchTelematicsData, 30000);
    return () => clearInterval(interval);
  }, [fetchTelematicsData]);

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

  const inTransitMatchedLoads = useMemo(
    () => matchedLoads.filter(({ load }) => load.status === 'in-transit'),
    [matchedLoads]
  );

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

  const inTransitTrackedVehicles = inTransitMatchedLoads.filter(
    (m) => m.asset && m.asset.lastLatitude && m.asset.lastLongitude
  );

  const isLoading = loadsLoading || telematicsLoading;

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(prevId => prevId === vehicleId ? null : vehicleId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard title="Active Loads" value={loads.length} icon={Package} />
        <StatCard 
          title="In Transit" 
          value={loads.filter((l) => l.status === 'in-transit').length} 
          icon={Truck} 
        />
        <StatCard 
          title="Scheduled" 
          value={loads.filter((l) => l.status === 'scheduled').length} 
          icon={Clock} 
        />
        <StatCard 
          title="Tracked" 
          value={inTransitTrackedVehicles.length} 
          icon={Navigation} 
        />
      </div>

      {/* Map Card */}
      <Card className="overflow-hidden border-subtle shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-subtle">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : telematicsError ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-subtle">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Unable to load tracking data</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchTelematicsData}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : inTransitMatchedLoads.length === 0 ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-subtle">
              <div className="text-center">
                <Package className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No in-transit loads to track</p>
              </div>
            </div>
          ) : (
            <div className="relative h-[430px] sm:h-[500px] lg:h-[560px]">
              <MapContainer
                center={[-19.5, 30.5]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
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
                      color: 'hsl(var(--primary)/0.3)',
                      fillColor: 'hsl(var(--primary)/0.05)',
                      fillOpacity: 0.5,
                    }}
                  >
                    <Tooltip direction="bottom" offset={[0, 10]}>
                      <span className="text-xs font-medium">{depot.name}</span>
                    </Tooltip>
                  </Circle>
                ))}

                {/* Vehicle Markers */}
                {inTransitTrackedVehicles.map(({ load, asset }) => {
                  if (!asset?.lastLatitude || !asset?.lastLongitude) return null;

                  const isSelected = selectedVehicleId === asset.id.toString();

                  return (
                    <Marker
                      key={load.id}
                      position={[asset.lastLatitude, asset.lastLongitude]}
                      icon={createVehicleIcon(asset, isSelected, load.fleet_vehicle?.vehicle_id)}
                      eventHandlers={{
                        click: () => handleVehicleSelect(asset.id.toString())
                      }}
                      zIndexOffset={isSelected ? 1000 : 0}
                    >
                      <Popup className="rounded-lg">
                        <div className="p-2.5 min-w-[230px]">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: asset.speedKmH > 0 ? '#22c55e' : '#ef4444' }} />
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{load.load_id}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{load.fleet_vehicle?.vehicle_id}</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <p style={{ color: '#374151', fontWeight: 500 }}>
                              {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
                            </p>
                            <p style={{ color: '#1f2937' }}>Speed: <strong>{asset.speedKmH} km/h</strong></p>
                            <p style={{ color: '#6b7280', fontSize: 10 }}>
                              Updated {formatLastConnected(asset.lastConnectedUtc)}
                            </p>
                          </div>
                        </div>
                      </Popup>
                      <Tooltip direction="top" offset={[0, -16]} opacity={0.9}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{load.fleet_vehicle?.vehicle_id || load.load_id}</span>
                      </Tooltip>
                    </Marker>
                  );
                })}

                {/* Selected vehicle: route + depot pins */}
                {(() => {
                  if (!selectedVehicleId) return null;
                  const match = inTransitTrackedVehicles.find(({ asset }) => asset?.id.toString() === selectedVehicleId);
                  if (!match?.asset?.lastLatitude || !match?.asset?.lastLongitude) return null;

                  const { load, asset } = match;
                  const originName = getLocationDisplayName(load.origin);
                  const destName = getLocationDisplayName(load.destination);
                  const originDepot = allDepots.find((d) => d.name === originName);
                  const destDepot = allDepots.find((d) => d.name === destName);

                  // Only show the remaining route: vehicle position → destination
                  const routeWaypoints: { latitude: number; longitude: number }[] = [];
                  routeWaypoints.push({ latitude: asset.lastLatitude!, longitude: asset.lastLongitude! });
                  if (destDepot) routeWaypoints.push({ latitude: destDepot.latitude, longitude: destDepot.longitude });

                  return (
                    <React.Fragment>
                      {originDepot && (
                        <Marker
                          position={[originDepot.latitude, originDepot.longitude]}
                          icon={createDepotPinIcon(originName, 'origin')}
                        />
                      )}
                      {destDepot && (
                        <Marker
                          position={[destDepot.latitude, destDepot.longitude]}
                          icon={createDepotPinIcon(destName, 'destination')}
                        />
                      )}
                      {routeWaypoints.length >= 2 && (
                        <RoadRoutePolyline
                          waypoints={routeWaypoints}
                          isSelected={true}
                        />
                      )}
                    </React.Fragment>
                  );
                })()}
              </MapContainer>

              {/* Fleet selection side panel (desktop) / bottom panel (mobile) */}
              {inTransitTrackedVehicles.length > 0 && (
                <div className="absolute z-[1000] left-3 right-3 bottom-3 md:top-3 md:left-3 md:right-auto md:bottom-auto md:w-80">
                  <div className="rounded-xl border border-subtle bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-lg">
                    <div className="p-3 border-b border-subtle">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold tracking-tight">Fleet Selection</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchTelematicsData}
                          disabled={telematicsLoading}
                          className="h-7 px-2 gap-1 text-[11px] border-subtle"
                        >
                          <RefreshCw className={cn('h-3 w-3', telematicsLoading && 'animate-spin')} />
                          Refresh
                        </Button>
                      </div>
                      {lastRefresh && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Updated {formatLastConnected(lastRefresh.toISOString())}
                        </p>
                      )}
                    </div>

                    <div className="p-2 max-h-48 md:max-h-72 overflow-y-auto space-y-1.5">
                      {inTransitTrackedVehicles.map(({ load, asset }) => (
                        <button
                          key={load.id}
                          onClick={() => asset && handleVehicleSelect(asset.id.toString())}
                          className={cn(
                            'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                            selectedVehicleId === asset?.id.toString()
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'bg-card border-subtle hover:bg-subtle/70'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">
                              {load.fleet_vehicle?.vehicle_id || `V${asset?.id}`}
                            </span>
                            <span className="text-[11px] opacity-80">{load.load_id}</span>
                          </div>
                          <p className="text-xs opacity-80 truncate mt-0.5">
                            {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
                          </p>
                        </button>
                      ))}
                    </div>

                    {selectedVehicleId && (
                      <div className="p-2 border-t border-subtle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVehicleId(null)}
                          className="w-full text-xs"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Shipments List */}
      <Card className="border-subtle shadow-sm">
        <CardHeader className="px-4 py-3.5 border-b border-subtle bg-card/70">
          <CardTitle className="text-sm font-semibold tracking-tight">Active Shipments</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {loadsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : loads.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active shipments
            </div>
          ) : (
            matchedLoads.map(({ load, asset }) => (
              <button
                key={load.id}
                onClick={() => asset && handleVehicleSelect(asset.id.toString())}
                className={cn(
                  "w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-subtle/70",
                  selectedVehicleId === asset?.id.toString() && "bg-subtle/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-subtle border border-subtle">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{load.load_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {load.fleet_vehicle && (
                    <span className="text-xs text-muted-foreground">
                      {load.fleet_vehicle.vehicle_id}
                    </span>
                  )}
                  <Badge data-status={load.status} className="status-badge">
                    {load.status}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-medium">{value}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-subtle">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}