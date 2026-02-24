import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClientActiveLoads, useClientLoads } from '@/hooks/useClientLoads';
import type { Load } from '@/hooks/useLoads';
import { calculateDepotETA, findDepotByName, isWithinDepot, calculateDepotTripProgress, customLocationToDepot } from '@/lib/depots';
import { useCustomLocations } from '@/hooks/useCustomLocations';
import { parseTimeWindow, computeTimeVariance, formatTimeAsSAST } from '@/lib/timeWindow';
import {
  authenticate,
  formatLastConnected,
  getAssetsWithPositions,
  getOrganisations,
  isAuthenticated,
  type TelematicsAsset,
} from '@/lib/telematicsGuru';
import { getLocationDisplayName, cn, safeFormatDate } from '@/lib/utils';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Route,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

interface LoadWithETA extends Load {
  telematicsAsset?: TelematicsAsset | null;
  progressData?: {
    progress: number;
    totalDistance: number;
    distanceRemaining: number;
    etaFormatted: string;
    durationFormatted: string;
    isAtOrigin?: boolean;
    isAtDestination?: boolean;
  } | null;
}

export default function ClientDeliveriesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: activeLoads = [], isLoading: activeLoading } = useClientActiveLoads(clientId);
  const { data: allLoads = [], isLoading: allLoading } = useClientLoads(clientId);
  const { data: customLocations = [] } = useCustomLocations();

  const extraDepots = useMemo(
    () => customLocations.map(customLocationToDepot),
    [customLocations]
  );

  const [telematicsAssets, setTelematicsAssets] = useState<TelematicsAsset[]>([]);
  const [telematicsLoading, setTelematicsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [organisationId, setOrganisationId] = useState<number | null>(() => {
    const stored = localStorage.getItem('telematics_org_id');
    return stored ? parseInt(stored) : null;
  });

  const fetchTelematicsData = useCallback(async () => {
    if (!isAuthenticated()) {
      const username = localStorage.getItem('telematics_username');
      const password = localStorage.getItem('telematics_password');
      if (username && password) {
        const success = await authenticate(username, password);
        if (!success) return;
      } else {
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
          localStorage.setItem('telematics_org_id', orgId.toString());
        } else {
          return;
        }
      }

      const assets = await getAssetsWithPositions(orgId);
      setTelematicsAssets(assets || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch telematics data:', error);
    } finally {
      setTelematicsLoading(false);
    }
  }, [organisationId]);

  useEffect(() => {
    fetchTelematicsData();
    const interval = setInterval(fetchTelematicsData, 30000);
    return () => clearInterval(interval);
  }, [fetchTelematicsData]);

  // Enrich loads with tracking data
  const loadsWithETA: LoadWithETA[] = useMemo(() => {
    // Determine the "current" load per vehicle (in-transit first, then earliest offloading date)
    const statusPriority: Record<string, number> = { 'in-transit': 0, 'scheduled': 1, 'pending': 2 };
    const currentLoadPerVehicle = new Map<string, string>();
    const vehicleGroups = new Map<string, typeof activeLoads>();
    for (const load of activeLoads) {
      const vid = load.fleet_vehicle?.vehicle_id;
      if (!vid) continue;
      if (!vehicleGroups.has(vid)) vehicleGroups.set(vid, []);
      vehicleGroups.get(vid)!.push(load);
    }
    for (const [vid, vLoads] of vehicleGroups) {
      const sorted = [...vLoads].sort((a, b) => {
        const sp = (statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3);
        if (sp !== 0) return sp;
        const offDiff = new Date(a.offloading_date).getTime() - new Date(b.offloading_date).getTime();
        if (offDiff !== 0) return offDiff;
        return new Date(a.loading_date).getTime() - new Date(b.loading_date).getTime();
      });
      if (sorted[0]) currentLoadPerVehicle.set(vid, sorted[0].id);
    }

    return activeLoads.map((load) => {
      const vehicleId = load.fleet_vehicle?.telematics_asset_id;
      const asset = vehicleId
        ? telematicsAssets.find((a) => a.id.toString() === vehicleId || a.code === vehicleId)
        : null;

      // Only compute geofence position for the current load per vehicle
      const isCurrentLoad = load.fleet_vehicle?.vehicle_id
        ? currentLoadPerVehicle.get(load.fleet_vehicle.vehicle_id) === load.id
        : true;

      let progressData = null;
      if (asset && asset.lastLatitude && asset.lastLongitude) {
        const originName = getLocationDisplayName(load.origin);
        const destName = getLocationDisplayName(load.destination);
        const originDepot = findDepotByName(originName, extraDepots);
        const destDepot = findDepotByName(destName, extraDepots);

        if (originDepot && destDepot) {
          const tripProgress = calculateDepotTripProgress(
            originDepot,
            destDepot,
            asset.lastLatitude,
            asset.lastLongitude
          );
          
          const eta = calculateDepotETA(
            tripProgress.distanceRemaining,
            asset.speedKmH || 60
          );

          progressData = {
            progress: tripProgress.progress,
            totalDistance: tripProgress.totalDistance,
            distanceRemaining: tripProgress.distanceRemaining,
            etaFormatted: eta?.etaFormatted || 'N/A',
            durationFormatted: eta?.durationFormatted || 'N/A',
            // Only report geofence arrival/departure for the current load
            isAtOrigin: isCurrentLoad && isWithinDepot(asset.lastLatitude, asset.lastLongitude, originDepot),
            isAtDestination: isCurrentLoad && isWithinDepot(asset.lastLatitude, asset.lastLongitude, destDepot),
          };
        }
      }

      return {
        ...load,
        telematicsAsset: asset,
        progressData,
      };
    });
  }, [activeLoads, telematicsAssets, extraDepots]);

  // Recent deliveries (last 10 delivered)
  const recentDeliveries = useMemo(() => {
    return allLoads
      .filter((l) => l.status === 'delivered')
      .sort((a, b) => new Date(b.offloading_date).getTime() - new Date(a.offloading_date).getTime())
      .slice(0, 10);
  }, [allLoads]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDeliveries = allLoads.filter(
      (l) => l.status === 'delivered' && new Date(l.offloading_date) >= startOfDay
    );

    return {
      activeInTransit: loadsWithETA.filter((l) => l.status === 'in-transit').length,
      scheduled: loadsWithETA.filter((l) => l.status === 'scheduled').length,
      deliveredToday: todayDeliveries.length,
      totalDelivered: allLoads.filter((l) => l.status === 'delivered').length,
    };
  }, [loadsWithETA, allLoads]);

  const isLoading = activeLoading || allLoading;

  return (
    <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Route className="h-5 w-5 text-purple-500" />
                Delivery Tracking
              </h2>
              <p className="text-sm text-muted-foreground">
                Real-time delivery status and estimated arrival times
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
                <RefreshCw className={cn('h-4 w-4 mr-2', telematicsLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  {stats.activeInTransit}
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
                  {stats.scheduled}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {stats.deliveredToday}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  {stats.totalDelivered}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-500" />
                Active Deliveries
              </CardTitle>
              <CardDescription>
                Shipments currently in progress with live tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : loadsWithETA.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No active deliveries</p>
                  <p className="text-sm">Your in-progress shipments will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loadsWithETA.map((load) => (
                    <DeliveryCard key={load.id} load={load} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Recent Deliveries
              </CardTitle>
              <CardDescription>
                Your most recently completed shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentDeliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No completed deliveries yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentDeliveries.map((load) => (
                    <div key={load.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{load.load_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">Delivered</p>
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(load.offloading_date, 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </TooltipProvider>
  );
}

function DeliveryCard({ load }: { load: LoadWithETA }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);
  const progress = load.progressData?.progress ?? 0;
  const hasTracking = !!load.telematicsAsset;

  const getStatusInfo = () => {
    if (load.progressData?.isAtDestination) {
      return { text: 'Arrived at destination', color: 'text-green-600', icon: CheckCircle2 };
    }
    if (load.progressData?.isAtOrigin) {
      return { text: 'At loading point', color: 'text-amber-600', icon: MapPin };
    }
    if (load.status === 'in-transit') {
      return { text: 'In transit', color: 'text-blue-600', icon: Truck };
    }
    if (load.status === 'scheduled') {
      return { text: 'Scheduled', color: 'text-gray-600', icon: Clock };
    }
    return { text: load.status, color: 'text-gray-600', icon: Package };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          {/* Load Info */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold">{load.load_id}</p>
                <p className="text-sm text-muted-foreground">
                  {load.fleet_vehicle?.vehicle_id || 'No vehicle assigned'}
                  {load.driver && ` • ${load.driver.name}`}
                </p>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center gap-2 text-sm min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{origin}</span>
              <span className="text-muted-foreground flex-shrink-0">→</span>
              <span className="font-medium truncate">{destination}</span>
            </div>

            {/* Progress Bar */}
            {load.status === 'in-transit' && hasTracking && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Delivery Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Loading: {safeFormatDate(load.loading_date, 'dd MMM')}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Expected: {safeFormatDate(load.offloading_date, 'dd MMM')}
              </div>
            </div>

            {/* Actual Times vs Planned */}
            {(() => {
              const tw = parseTimeWindow(load.time_window);
              const hasAnyActual = load.actual_loading_arrival || load.actual_loading_departure || load.actual_offloading_arrival || load.actual_offloading_departure;
              if (!hasAnyActual) return null;

              const timePoints = [
                { label: 'Loading Arr.', actual: load.actual_loading_arrival, planned: tw.origin.plannedArrival },
                { label: 'Loading Dep.', actual: load.actual_loading_departure, planned: tw.origin.plannedDeparture },
                { label: 'Offload Arr.', actual: load.actual_offloading_arrival, planned: tw.destination.plannedArrival },
                { label: 'Offload Dep.', actual: load.actual_offloading_departure, planned: tw.destination.plannedDeparture },
              ].filter(tp => tp.actual);

              if (timePoints.length === 0) return null;

              return (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex flex-wrap gap-3">
                    {timePoints.map((tp) => {
                      const v = computeTimeVariance(tp.planned, tp.actual);
                      return (
                        <div key={tp.label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{tp.label}</span>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-semibold">{formatTimeAsSAST(tp.actual)}</span>
                          </div>
                          {tp.planned && <span className="text-[10px] text-muted-foreground">Plan: {formatTimeAsSAST(tp.planned) || tp.planned}</span>}
                          {v.diffMin !== null && v.diffMin !== 0 && (
                            v.isLate ? (
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0 rounded border ${v.diffMin > 60 ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                                <ArrowUp className="w-2.5 h-2.5" />{v.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0 rounded">
                                <ArrowDown className="w-2.5 h-2.5" />{v.label}
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
          </div>

          {/* Status & ETA */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-2 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 flex-shrink-0">
            <div className={cn('flex items-center gap-1.5 justify-end', statusInfo.color)}>
              <StatusIcon className="h-4 w-4" />
              <span className="font-medium text-sm">{statusInfo.text}</span>
            </div>

            {hasTracking && load.progressData && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-semibold">{load.progressData.etaFormatted}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm">{load.progressData.distanceRemaining?.toFixed(1)} km</p>
                </div>
              </>
            )}

            {!hasTracking && load.status === 'in-transit' && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    No GPS
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vehicle GPS tracking not available</p>
                </TooltipContent>
              </Tooltip>
            )}

            {load.telematicsAsset?.lastConnectedUtc && (
              <p className="text-xs text-muted-foreground">
                Updated {formatLastConnected(load.telematicsAsset.lastConnectedUtc)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}