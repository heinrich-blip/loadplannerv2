import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/loads/StatusBadge';
import { FeedbackWidget } from '@/components/clients/FeedbackWidget';
import { useClientLoads } from '@/hooks/useClientLoads';
import { useClientFeedback } from '@/hooks/useClientFeedback';
import type { Load } from '@/hooks/useLoads';
import { parseTimeWindow, timeToSASTMinutes } from '@/lib/timeWindow';
import { cn, getLocationDisplayName, safeFormatDate } from '@/lib/utils';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Frown,
  MapPin,
  Package,
  Smile,
  ThumbsUp,
  Truck,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { endOfWeek, format, isValid, parseISO, startOfWeek } from 'date-fns';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return safeFormatDate(value, 'dd MMM HH:mm', '—');
}

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

  if (absMins <= 10) {
    return { label: 'On time', className: 'text-success' };
  }

  if (absMins >= 60) {
    const hours = (absMins / 60).toFixed(absMins % 60 === 0 ? 0 : 1);
    return {
      label: `${diffMins > 0 ? '+' : '-'}${hours}h`,
      className: 'text-warning',
    };
  }

  return {
    label: `${diffMins > 0 ? '+' : '-'}${absMins}m`,
    className: 'text-warning',
  };
}

export default function ClientServiceHistoryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: allLoads = [], isLoading: loadsLoading } = useClientLoads(clientId);
  const { data: feedbackList = [], isLoading: feedbackLoading } = useClientFeedback(clientId);

  const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeekKey);

  // Build feedback lookup
  const feedbackByLoadId = useMemo(() => {
    const map = new Map<string, (typeof feedbackList)[number]>();
    for (const fb of feedbackList) {
      map.set(fb.load_id, fb);
    }
    return map;
  }, [feedbackList]);

  const getWeekLabel = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekNumber = Number(format(weekStart, 'I'));
    const weekYear = format(weekStart, 'R');
    return `Week ${weekNumber} (${weekYear}) · ${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`;
  };

  // Generate list of historical weeks from load data (Mon-Sun) and include current week
  const availableWeeks = useMemo(() => {
    const weekSet = new Map<string, string>();

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentKey = format(currentWeekStart, 'yyyy-MM-dd');
    weekSet.set(currentKey, getWeekLabel(currentWeekStart));

    for (const load of allLoads) {
      try {
        const d = parseISO(load.offloading_date || load.loading_date);
        if (!isValid(d)) continue;
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const key = format(weekStart, 'yyyy-MM-dd');
        const label = getWeekLabel(weekStart);
        weekSet.set(key, label);
      } catch {
        // skip invalid dates
      }
    }

    return Array.from(weekSet.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [allLoads]);

  // Filter loads by selected week (Monday-Sunday)
  const filteredLoads = useMemo(() => {
    if (selectedWeek === 'all') return allLoads;

    return allLoads.filter((load) => {
      try {
        const d = parseISO(load.offloading_date || load.loading_date);
        if (!isValid(d)) return false;
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        return weekKey === selectedWeek;
      } catch {
        return false;
      }
    });
  }, [allLoads, selectedWeek]);

  // Calculate service stats
  const serviceStats = useMemo(() => {
    const total = filteredLoads.length;
    const delivered = filteredLoads.filter((l) => l.status === 'delivered').length;
    const inTransit = filteredLoads.filter((l) => l.status === 'in-transit').length;
    const scheduled = filteredLoads.filter(
      (l) => l.status === 'scheduled' || l.status === 'pending'
    ).length;

    // Count feedback stats for this period
    let happyCount = 0;
    let unhappyCount = 0;
    let feedbackCount = 0;

    for (const load of filteredLoads) {
      const fb = feedbackByLoadId.get(load.id);
      if (fb) {
        feedbackCount++;
        if (fb.rating === 'happy') happyCount++;
        else unhappyCount++;
      }
    }

    // On-time delivery calculation based on planned vs actual destination arrival times
    // On-time rule: actual arrival within 10 minutes late of planned time (early counts as on-time)
    let onTimeCount = 0;
    let deliveredWithTiming = 0;

    for (const load of filteredLoads) {
      if (load.status !== 'delivered') continue;

      const plannedArrival = parseTimeWindow(load.time_window).destination.plannedArrival;
      const actualArrival = load.actual_offloading_arrival;
      const plannedMins = timeToSASTMinutes(plannedArrival);
      const actualMins = timeToSASTMinutes(actualArrival);

      if (plannedMins === null || actualMins === null) continue;

      deliveredWithTiming++;
      const diffMins = actualMins - plannedMins;
      if (diffMins <= 10) onTimeCount++;
    }

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const satisfactionRate =
      feedbackCount > 0 ? Math.round((happyCount / feedbackCount) * 100) : null;
    const onTimeRate =
      deliveredWithTiming > 0 ? Math.round((onTimeCount / deliveredWithTiming) * 100) : null;

    return {
      total,
      delivered,
      inTransit,
      scheduled,
      happyCount,
      unhappyCount,
      feedbackCount,
      deliveryRate,
      satisfactionRate,
      onTimeRate,
      onTimeCount,
      deliveredWithTiming,
    };
  }, [filteredLoads, feedbackByLoadId]);

  // Delivered loads for the list, sorted most recent first
  const deliveredLoads = useMemo(() => {
    return filteredLoads
      .filter((l) => l.status === 'delivered')
      .sort(
        (a, b) =>
          new Date(b.offloading_date || b.loading_date).getTime() -
          new Date(a.offloading_date || a.loading_date).getTime()
      );
  }, [filteredLoads]);

  const isLoading = loadsLoading || feedbackLoading;
  const weekLabel =
    selectedWeek === 'all'
      ? 'All Time'
      : availableWeeks.find(([k]) => k === selectedWeek)?.[1] || selectedWeek;

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-card border border-subtle rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-full sm:w-[200px] border-subtle">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {availableWeeks.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Service Delivery Metrics */}
      <div className="stats-grid">
        <MetricCard
          title="Total Loads"
          value={serviceStats.total}
          icon={Package}
          color="purple"
          loading={isLoading}
        />
        <MetricCard
          title="Delivered"
          value={serviceStats.delivered}
          icon={CheckCircle2}
          color="green"
          subtitle={
            serviceStats.total > 0
              ? `${serviceStats.deliveryRate}% completion`
              : undefined
          }
          loading={isLoading}
        />
        <MetricCard
          title="Satisfaction"
          value={
            serviceStats.satisfactionRate !== null
              ? `${serviceStats.satisfactionRate}%`
              : '—'
          }
          icon={ThumbsUp}
          color="blue"
          subtitle={
            serviceStats.feedbackCount > 0
              ? `${serviceStats.feedbackCount} ratings`
              : 'No ratings yet'
          }
          loading={isLoading}
        />
        <MetricCard
          title="On-Time Rate"
          value={
            serviceStats.onTimeRate !== null
              ? `${serviceStats.onTimeRate}%`
              : '—'
          }
          icon={TrendingUp}
          color="amber"
          subtitle={
            serviceStats.deliveredWithTiming > 0
              ? `${serviceStats.onTimeCount}/${serviceStats.deliveredWithTiming} on time`
              : 'No data yet'
          }
          loading={isLoading}
        />
      </div>

      {/* Satisfaction Breakdown */}
      {serviceStats.feedbackCount > 0 && (
        <Card className="border-subtle shadow-sm">
          <CardHeader className="pb-3 border-b border-subtle bg-card/70">
            <CardTitle className="text-sm sm:text-base font-semibold tracking-tight flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-primary" />
              Customer Satisfaction — {weekLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-24">
                  <Smile className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Happy</span>
                </div>
                <div className="flex-1">
                  <Progress
                    value={
                      serviceStats.feedbackCount > 0
                        ? (serviceStats.happyCount / serviceStats.feedbackCount) * 100
                        : 0
                    }
                    className="h-3"
                  />
                </div>
                <span className="text-sm font-semibold w-12 text-right">
                  {serviceStats.happyCount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-24">
                  <Frown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Unhappy</span>
                </div>
                <div className="flex-1">
                  <Progress
                    value={
                      serviceStats.feedbackCount > 0
                        ? (serviceStats.unhappyCount / serviceStats.feedbackCount) * 100
                        : 0
                    }
                    className="h-3 [&>div]:bg-red-500"
                  />
                </div>
                <span className="text-sm font-semibold w-12 text-right">
                  {serviceStats.unhappyCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Deliveries List */}
      <Card className="border-subtle shadow-sm">
        <CardHeader className="pb-3 border-b border-subtle bg-card/70">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-semibold tracking-tight flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Delivered — {weekLabel}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {deliveredLoads.length} deliveries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : deliveredLoads.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No deliveries found</p>
              <p className="text-xs mt-1">
                {selectedWeek === 'all'
                  ? 'No completed deliveries yet'
                  : `No deliveries for ${weekLabel}`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {deliveredLoads.map((load) => (
                <PastDeliveryRow
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

/* ——— Sub-components ——— */

/** Single past delivery row */
function PastDeliveryRow({
  load,
  clientId,
  feedback,
}: {
  load: Load;
  clientId: string;
  feedback: ReturnType<typeof Map.prototype.get> | null;
}) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);
  const timeWindow = parseTimeWindow(load.time_window);

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
    <div className="px-4 py-3.5 hover:bg-subtle/70 transition-colors">
      {/* Desktop */}
      <div className="hidden md:block space-y-3">
        <div className="flex items-center gap-4">
        <div className="w-24 flex-shrink-0">
          <p className="font-mono text-sm font-semibold">{load.load_id}</p>
          {load.fleet_vehicle && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {load.fleet_vehicle.vehicle_id}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="truncate max-w-[140px]">{origin}</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-emerald-600 flex-shrink-0" />
            <span className="truncate max-w-[140px]">{destination}</span>
          </div>
        </div>

        <div className="w-24 flex-shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3" />
            {safeFormatDate(load.offloading_date, 'dd MMM yyyy')}
          </p>
        </div>

        <div className="w-20 flex-shrink-0">
          <StatusBadge status={load.status} size="sm" />
        </div>

        <div className="w-36 flex-shrink-0">
          <FeedbackWidget loadId={load.id} clientId={clientId} existingFeedback={feedback} />
        </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Loading</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground">Arrival</p>
                <p className="font-medium">{formatDateTime(load.actual_loading_arrival)}</p>
                <p className={cn('font-semibold', loadingArrivalVariance.className)}>{loadingArrivalVariance.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Departure</p>
                <p className="font-medium">{formatDateTime(load.actual_loading_departure)}</p>
                <p className={cn('font-semibold', loadingDepartureVariance.className)}>{loadingDepartureVariance.label}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Offloading</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground">Arrival</p>
                <p className="font-medium">{formatDateTime(load.actual_offloading_arrival)}</p>
                <p className={cn('font-semibold', offloadingArrivalVariance.className)}>{offloadingArrivalVariance.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Departure</p>
                <p className="font-medium">{formatDateTime(load.actual_offloading_departure)}</p>
                <p className={cn('font-semibold', offloadingDepartureVariance.className)}>{offloadingDepartureVariance.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-mono text-sm font-semibold">{load.load_id}</span>
          </div>
          <StatusBadge status={load.status} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {origin} → {destination}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {safeFormatDate(load.offloading_date, 'dd MMM yyyy')}
          </span>
          {load.fleet_vehicle && (
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {load.fleet_vehicle.vehicle_id}
            </span>
          )}
        </div>
        <div className="pt-1">
          <FeedbackWidget loadId={load.id} clientId={clientId} existingFeedback={feedback} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground">Load Arr</p>
            <p>{formatDateTime(load.actual_loading_arrival)}</p>
            <p className={cn('font-semibold', loadingArrivalVariance.className)}>{loadingArrivalVariance.label}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground">Load Dep</p>
            <p>{formatDateTime(load.actual_loading_departure)}</p>
            <p className={cn('font-semibold', loadingDepartureVariance.className)}>{loadingDepartureVariance.label}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground">Off Arr</p>
            <p>{formatDateTime(load.actual_offloading_arrival)}</p>
            <p className={cn('font-semibold', offloadingArrivalVariance.className)}>{offloadingArrivalVariance.label}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground">Off Dep</p>
            <p>{formatDateTime(load.actual_offloading_departure)}</p>
            <p className={cn('font-semibold', offloadingDepartureVariance.className)}>{offloadingDepartureVariance.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  loading,
}: {
  title: string;
  value: number | string;
  icon: typeof Package;
  color: 'purple' | 'blue' | 'green' | 'amber';
  subtitle?: string;
  loading?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-subtle text-foreground border border-subtle',
    blue: 'bg-subtle text-primary border border-subtle',
    green: 'bg-subtle text-emerald-700 dark:text-emerald-400 border border-subtle',
    amber: 'bg-subtle text-amber-700 dark:text-amber-400 border border-subtle',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="kpi-card">
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
