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
import { format, parseISO, isValid } from 'date-fns';

export default function ClientServiceHistoryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: allLoads = [], isLoading: loadsLoading } = useClientLoads(clientId);
  const { data: feedbackList = [], isLoading: feedbackLoading } = useClientFeedback(clientId);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Build feedback lookup
  const feedbackByLoadId = useMemo(() => {
    const map = new Map<string, (typeof feedbackList)[number]>();
    for (const fb of feedbackList) {
      map.set(fb.load_id, fb);
    }
    return map;
  }, [feedbackList]);

  // Generate list of months from load data
  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, string>();
    for (const load of allLoads) {
      try {
        const d = parseISO(load.offloading_date || load.loading_date);
        if (!isValid(d)) continue;
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMMM yyyy');
        monthSet.set(key, label);
      } catch {
        // skip invalid dates
      }
    }
    // Sort descending (most recent first)
    return Array.from(monthSet.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [allLoads]);

  // Filter loads by selected month
  const filteredLoads = useMemo(() => {
    if (selectedMonth === 'all') return allLoads;
    return allLoads.filter((load) => {
      try {
        const d = parseISO(load.offloading_date || load.loading_date);
        if (!isValid(d)) return false;
        return format(d, 'yyyy-MM') === selectedMonth;
      } catch {
        return false;
      }
    });
  }, [allLoads, selectedMonth]);

  // Calculate monthly service stats
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

    // On-time delivery calculation: loads that were delivered on or before offloading_date
    let onTimeCount = 0;
    let deliveredWithDates = 0;
    for (const load of filteredLoads) {
      if (load.status === 'delivered') {
        if (load.actual_offloading_arrival && load.offloading_date) {
          deliveredWithDates++;
          try {
            const actualDate = parseISO(load.actual_offloading_arrival);
            const plannedDate = parseISO(load.offloading_date);
            // Consider on-time if arrived within the same day or earlier
            const actualDay = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
            const plannedDay = new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate());
            if (actualDay <= plannedDay) onTimeCount++;
          } catch {
            // skip
          }
        }
      }
    }

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const satisfactionRate =
      feedbackCount > 0 ? Math.round((happyCount / feedbackCount) * 100) : null;
    const onTimeRate =
      deliveredWithDates > 0 ? Math.round((onTimeCount / deliveredWithDates) * 100) : null;

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
      deliveredWithDates,
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
  const monthLabel =
    selectedMonth === 'all'
      ? 'All Time'
      : availableMonths.find(([k]) => k === selectedMonth)?.[1] || selectedMonth;

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-card border border-subtle rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px] border-subtle">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {availableMonths.map(([key, label]) => (
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
            serviceStats.deliveredWithDates > 0
              ? `${serviceStats.onTimeCount}/${serviceStats.deliveredWithDates} on time`
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
              Customer Satisfaction — {monthLabel}
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
              Delivered — {monthLabel}
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
                {selectedMonth === 'all'
                  ? 'No completed deliveries yet'
                  : `No deliveries for ${monthLabel}`}
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

  return (
    <div className="px-4 py-3.5 hover:bg-subtle/70 transition-colors">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-4">
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
