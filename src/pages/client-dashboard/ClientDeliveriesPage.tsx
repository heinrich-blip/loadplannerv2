// ClientDeliveriesPage.tsx — Professional list-based delivery tracking
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/loads/StatusBadge';
import { FeedbackWidget } from '@/components/clients/FeedbackWidget';
import { useClientActiveLoads, useClientLoads } from '@/hooks/useClientLoads';
import { useClientFeedback } from '@/hooks/useClientFeedback';
import type { ClientFeedback } from '@/hooks/useClientFeedback';
import type { Load } from '@/hooks/useLoads';
import {
  calculateDepotETA,
  findDepotByName,
  isWithinDepot,
  calculateDepotTripProgress,
  customLocationToDepot,
} from '@/lib/depots';
import { useCustomLocations } from '@/hooks/useCustomLocations';
import { parseTimeWindow, timeToSASTMinutes } from '@/lib/timeWindow';
import {
  authenticate,
  getAssetsWithPositions,
  getOrganisations,
  isAuthenticated,
  type TelematicsAsset,
} from '@/lib/telematicsGuru';
import { getLocationDisplayName, cn, safeFormatDate } from '@/lib/utils';
import {
  ArrowRight,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  Gauge,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

/* ——— Types ——— */

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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return safeFormatDate(value, 'dd MMM HH:mm', '—');
}

/**
 * Calculate variance between actual and planned times
 * @param actual - Actual timestamp
 * @param planned - Planned timestamp
 * @param eventType - What kind of event this is
 * @returns Object with label and className for styling
 */
function getVarianceLabel(
  actual?: string | null, 
  planned?: string | null,
  eventType: 'loading_arrival' | 'loading_departure' | 'offloading_arrival' | 'offloading_departure' = 'loading_arrival'
) {
  if (!actual || !planned) return { label: '—', className: 'text-muted-foreground' };

  const plannedMins = timeToSASTMinutes(planned);
  const actualMins = timeToSASTMinutes(actual);
  if (plannedMins === null || actualMins === null) {
    return { label: '—', className: 'text-muted-foreground' };
  }

  const diffMins = actualMins - plannedMins;
  const absMins = Math.abs(diffMins);

  // Business logic:
  // - For arrivals (loading_arrival, offloading_arrival): 
  //   Early is good (can start early), Late is bad (delayed)
  // - For departures (loading_departure, offloading_departure):
  //   Early is bad (left before ready), Late is also bad (delayed departure)

  // Arrival events
  if (eventType === 'loading_arrival' || eventType === 'offloading_arrival') {
    if (absMins <= 10) {
      return { label: 'On time', className: 'text-success' };
    }

    if (absMins >= 60) {
      const hours = (absMins / 60).toFixed(absMins % 60 === 0 ? 0 : 1);
      return diffMins > 0
        ? { label: `+${hours}h late`, className: 'text-destructive' }
        : { label: `-${hours}h early`, className: 'text-success' };
    }

    return diffMins > 0
      ? { label: `+${absMins}m late`, className: 'text-destructive' }
      : { label: `-${absMins}m early`, className: 'text-success' };
  }

  // Departure events - both early and late are problematic
  if (eventType === 'loading_departure' || eventType === 'offloading_departure') {
    if (absMins <= 10) {
      return { label: 'On time', className: 'text-success' };
    }

    if (absMins >= 60) {
      const hours = (absMins / 60).toFixed(absMins % 60 === 0 ? 0 : 1);
      return { 
        label: `${diffMins > 0 ? '+' : '-'}${hours}h`, 
        className: 'text-warning' 
      };
    }

    return { 
      label: `${diffMins > 0 ? '+' : '-'}${absMins}m`, 
      className: 'text-warning' 
    };
  }

  return { label: '—', className: 'text-muted-foreground' };
}

/* ——— Main Component ——— */

export default function ClientDeliveriesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: activeLoads = [], isLoading: activeLoading } = useClientActiveLoads(clientId);
  const { data: allLoads = [], isLoading: allLoading } = useClientLoads(clientId);
  const { data: customLocations = [] } = useCustomLocations();
  const { data: feedbackList = [] } = useClientFeedback(clientId);

  const feedbackByLoadId = useMemo(() => {
    const map = new Map<string, typeof feedbackList[number]>();
    for (const fb of feedbackList) {
      map.set(fb.load_id, fb);
    }
    return map;
  }, [feedbackList]);

  const extraDepots = useMemo(() => customLocations.map(customLocationToDepot), [customLocations]);

  const [telematicsAssets, setTelematicsAssets] = useState<TelematicsAsset[]>([]);
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

    try {
      let orgId = organisationId;
      if (!orgId) {
        const orgs = await getOrganisations();
        if (orgs?.length) {
          orgId = orgs[0].id;
          setOrganisationId(orgId);
          localStorage.setItem('telematics_org_id', orgId.toString());
        } else {
          return;
        }
      }

      const assets = await getAssetsWithPositions(orgId);
      setTelematicsAssets(assets || []);
    } catch (error) {
      console.error('Failed to fetch telematics data:', error);
    }
  }, [organisationId]);

  useEffect(() => {
    fetchTelematicsData();
    const interval = setInterval(fetchTelematicsData, 30000);
    return () => clearInterval(interval);
  }, [fetchTelematicsData]);

  const loadsWithETA: LoadWithETA[] = useMemo(() => {
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

      const isCurrentLoad = load.fleet_vehicle?.vehicle_id
        ? currentLoadPerVehicle.get(load.fleet_vehicle.vehicle_id) === load.id
        : true;

      let progressData = null;
      if (asset?.lastLatitude && asset.lastLongitude) {
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

          const eta = calculateDepotETA(tripProgress.distanceRemaining, asset.speedKmH || 60);

          progressData = {
            progress: tripProgress.progress,
            totalDistance: tripProgress.totalDistance,
            distanceRemaining: tripProgress.distanceRemaining,
            etaFormatted: eta?.etaFormatted || 'N/A',
            durationFormatted: eta?.durationFormatted || 'N/A',
            isAtOrigin: isCurrentLoad && isWithinDepot(asset.lastLatitude, asset.lastLongitude, originDepot),
            isAtDestination: isCurrentLoad && isWithinDepot(asset.lastLatitude, asset.lastLongitude, destDepot),
          };
        }
      }

      return { ...load, telematicsAsset: asset, progressData };
    });
  }, [activeLoads, telematicsAssets, extraDepots]);

  const recentDeliveries = useMemo(() => {
    return allLoads
      .filter((l) => l.status === 'delivered')
      .sort((a, b) => new Date(b.offloading_date).getTime() - new Date(a.offloading_date).getTime())
      .slice(0, 10);
  }, [allLoads]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDeliveries = allLoads.filter(
      (l) => l.status === 'delivered' && new Date(l.offloading_date) >= startOfDay
    );

    const deliveredWithActual = allLoads.filter((l) => l.status === 'delivered' && l.actual_offloading_arrival);

    const avgDeliveryTimeMs =
      deliveredWithActual.length > 0
        ? deliveredWithActual.reduce((acc, l) => {
            const loading = new Date(l.loading_date).getTime();
            const delivery = new Date(l.actual_offloading_arrival!).getTime();
            return acc + (delivery - loading);
          }, 0) / deliveredWithActual.length
        : 0;

    return {
      activeInTransit: loadsWithETA.filter((l) => l.status === 'in-transit').length,
      scheduled: loadsWithETA.filter((l) => l.status === 'scheduled').length,
      deliveredToday: todayDeliveries.length,
      avgDeliveryTime: Math.round(avgDeliveryTimeMs / (1000 * 60 * 60)),
    };
  }, [loadsWithETA, allLoads]);

  const isLoading = activeLoading || allLoading;

  /* ——— Render ——— */
  return (
    <div className="space-y-8">
      {/* KPI Stats - Modern grid with clean cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="In Transit"
          value={stats.activeInTransit}
          icon={Truck}
          trend={stats.activeInTransit > 0 ? '+12%' : undefined}
        />
        <StatCard
          title="Scheduled"
          value={stats.scheduled}
          icon={Clock}
        />
        <StatCard
          title="Delivered Today"
          value={stats.deliveredToday}
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg. Delivery"
          value={`${stats.avgDeliveryTime}h`}
          icon={Gauge}
          subtitle="Average time"
        />
      </div>

      {/* Active Deliveries — Modern Card */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border/40 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Active Deliveries</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Currently in progress or scheduled</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 rounded-full">
              {loadsWithETA.length} {loadsWithETA.length === 1 ? 'shipment' : 'shipments'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : loadsWithETA.length === 0 ? (
            <EmptyState 
              icon={Package} 
              title="No active deliveries" 
              description="In-progress shipments will appear here" 
            />
          ) : (
            <div className="divide-y divide-border/40">
              {loadsWithETA.map((load) => (
                <DeliveryRow key={load.id} load={load} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deliveries — Modern Card */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border/40 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">Recent Deliveries</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Last 10 completed shipments</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : recentDeliveries.length === 0 ? (
            <EmptyState 
              icon={Box} 
              title="No completed deliveries yet" 
              description="Completed shipments will appear here" 
            />
          ) : (
            <div className="divide-y divide-border/40">
              {recentDeliveries.map((load) => (
                <RecentRow
                  key={load.id}
                  load={load}
                  clientId={clientId!}
                  feedback={feedbackByLoadId.get(load.id) ?? null}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */

/** Modern Stat Card */
function StatCard({ 
  title, 
  value, 
  icon: Icon,
  trend,
  subtitle 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  trend?: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              {trend && (
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                  {trend}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Single active delivery row — Modern professional list format */
function DeliveryRow({ load }: { load: LoadWithETA }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);
  const progress = load.progressData?.progress ?? 0;
  const hasTracking = !!load.telematicsAsset;
  const timeWindow = parseTimeWindow(load.time_window);
  
  // Calculate variances against planned event times in time_window
  const loadingArrivalVariance = getVarianceLabel(
    load.actual_loading_arrival, 
    timeWindow.origin.plannedArrival,
    'loading_arrival'
  );
  
  const loadingDepartureVariance = getVarianceLabel(
    load.actual_loading_departure, 
    timeWindow.origin.plannedDeparture,
    'loading_departure'
  );
  
  const offloadingArrivalVariance = getVarianceLabel(
    load.actual_offloading_arrival, 
    timeWindow.destination.plannedArrival,
    'offloading_arrival'
  );
  
  const offloadingDepartureVariance = getVarianceLabel(
    load.actual_offloading_departure, 
    timeWindow.destination.plannedDeparture,
    'offloading_departure'
  );

  return (
    <div className="px-6 py-5 hover:bg-muted/30 transition-colors">
      {/* Desktop Layout */}
      <div className="hidden lg:block space-y-4">
        {/* Main Row */}
        <div className="flex items-center gap-6">
          {/* Load ID & Vehicle */}
          <div className="w-40 flex-shrink-0">
            <p className="font-mono text-sm font-semibold text-foreground">{load.load_id}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{load.fleet_vehicle?.vehicle_id || 'No vehicle'}</span>
            </div>
          </div>

          {/* Route */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="truncate text-muted-foreground">{origin}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-success flex-shrink-0" />
                <span className="truncate text-muted-foreground">{destination}</span>
              </div>
            </div>
            {/* Date Range */}
            <div className="flex items-center gap-2 mt-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {safeFormatDate(load.loading_date, 'dd MMM')} → {safeFormatDate(load.offloading_date, 'dd MMM')}
              </span>
            </div>
          </div>

          {/* Progress & ETA */}
          <div className="w-64 flex-shrink-0">
            {load.status === 'in-transit' && hasTracking && load.progressData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ETA</span>
                  <span className="font-medium">{load.progressData.etaFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{load.progressData.distanceRemaining?.toFixed(0)} km</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-muted/30 rounded-lg py-3">
                {load.status === 'scheduled' ? 'Scheduled' : 'No tracking'}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="w-24 flex-shrink-0">
            <StatusBadge status={load.status} size="sm" />
          </div>
        </div>

        {/* Timing Details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
          {/* Loading Point */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <LogIn className="h-3.5 w-3.5" />
              Loading Point
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Arrival</p>
                <p className="text-sm font-medium">{formatDateTime(load.actual_loading_arrival)}</p>
                <p className={cn('text-xs font-medium', loadingArrivalVariance.className)}>
                  {loadingArrivalVariance.label}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="text-sm font-medium">{formatDateTime(load.actual_loading_departure)}</p>
                <p className={cn('text-xs font-medium', loadingDepartureVariance.className)}>
                  {loadingDepartureVariance.label}
                </p>
              </div>
            </div>
          </div>

          {/* Offloading Point */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              Offloading Point
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Arrival</p>
                <p className="text-sm font-medium">{formatDateTime(load.actual_offloading_arrival)}</p>
                <p className={cn('text-xs font-medium', offloadingArrivalVariance.className)}>
                  {offloadingArrivalVariance.label}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="text-sm font-medium">{formatDateTime(load.actual_offloading_departure)}</p>
                <p className={cn('text-xs font-medium', offloadingDepartureVariance.className)}>
                  {offloadingDepartureVariance.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-sm font-semibold">{load.load_id}</p>
            <p className="text-xs text-muted-foreground mt-1">{load.fleet_vehicle?.vehicle_id || 'No vehicle'}</p>
          </div>
          <StatusBadge status={load.status} size="sm" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground truncate">{origin}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-success flex-shrink-0" />
            <span className="text-muted-foreground truncate">{destination}</span>
          </div>
        </div>

        {load.status === 'in-transit' && hasTracking && load.progressData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ETA</span>
              <span className="font-medium">{load.progressData.etaFormatted}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <LogIn className="h-3 w-3" />
              Loading
            </p>
            <div className="text-xs space-y-1">
              <p>Arr: {formatDateTime(load.actual_loading_arrival)}</p>
              <p className={loadingArrivalVariance.className}>{loadingArrivalVariance.label}</p>
              <p className="mt-1.5">Dep: {formatDateTime(load.actual_loading_departure)}</p>
              <p className={loadingDepartureVariance.className}>{loadingDepartureVariance.label}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <LogOut className="h-3 w-3" />
              Offloading
            </p>
            <div className="text-xs space-y-1">
              <p>Arr: {formatDateTime(load.actual_offloading_arrival)}</p>
              <p className={offloadingArrivalVariance.className}>{offloadingArrivalVariance.label}</p>
              <p className="mt-1.5">Dep: {formatDateTime(load.actual_offloading_departure)}</p>
              <p className={offloadingDepartureVariance.className}>{offloadingDepartureVariance.label}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Recent delivery row with feedback — Clean modern design */
function RecentRow({
  load,
  clientId,
  feedback,
}: {
  load: Load;
  clientId: string;
  feedback: ClientFeedback | null;
}) {
  return (
    <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-full bg-success/10 text-success flex-shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-medium text-foreground">{load.load_id}</p>
              {feedback?.rating === 'unhappy' && (
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-medium rounded-full">
                  Issue Reported
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium text-success">Delivered</p>
            <p className="text-xs text-muted-foreground">{safeFormatDate(load.offloading_date, 'dd MMM yyyy')}</p>
          </div>
          <div className="w-36">
            <FeedbackWidget loadId={load.id} clientId={clientId} existingFeedback={feedback} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Empty state placeholder — Clean minimal design */
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-2xl bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}