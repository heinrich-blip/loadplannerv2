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
    return activeLoads.map((load) => {
      const vehicleId = load.fleet_vehicle?.telematics_asset_id;
      const asset = vehicleId
        ? telematicsAssets.find((a) => a.id.toString() === vehicleId || a.code === vehicleId)
        : null;

      let progressData = null;
      if (asset && asset.lastLatitude && asset.lastLongitude) {
        const originName = getLocationDisplayName(load.origin);
        const destName = getLocationDisplayName(load.destination);
        const originDepot = findDepotByName(originName, extraDepots);
        const destDepot = findDepotByName(destName, extraDepots);

        if (originDepot && destDepot) {
          // FIXED: Correct parameter order for calculateDepotTripProgress
          // It expects (origin, destination, currentLat, currentLng)
          const tripProgress = calculateDepotTripProgress(
            originDepot,
            destDepot,
            asset.lastLatitude,
            asset.lastLongitude
          );
          
          // FIXED: Correct parameter order for calculateDepotETA
          // It expects (distanceKm, speedKmH)
          const eta = calculateDepotETA(
            tripProgress.distanceRemaining,
            asset.speedKmH || 60 // Default to 60 km/h if speed is not available
          );

          progressData = {
            progress: tripProgress.progress,
            totalDistance: tripProgress.totalDistance,
            distanceRemaining: tripProgress.distanceRemaining,
            etaFormatted: eta?.etaFormatted || 'N/A',
            durationFormatted: eta?.durationFormatted || 'N/A',
            isAtOrigin: isWithinDepot(asset.lastLatitude, asset.lastLongitude, originDepot),
            isAtDestination: isWithinDepot(asset.lastLatitude, asset.lastLongitude, destDepot),
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Route className="h-5 w-5 text-purple-500" />
                Delivery Tracking
              </h2>
              <p className="text-sm text-muted-foreground">
                Real-time delivery status and estimated arrival times
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Load Info */}
          <div className="flex-1 space-y-3">
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
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{origin}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{destination}</span>
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
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Loading: {safeFormatDate(load.loading_date, 'dd MMM')}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Expected: {safeFormatDate(load.offloading_date, 'dd MMM')}
              </div>
            </div>
          </div>

          {/* Status & ETA */}
          <div className="text-right space-y-2">
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