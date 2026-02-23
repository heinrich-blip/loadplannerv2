import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Load } from '@/hooks/useLoads';
import { cn } from '@/lib/utils';
import
    {
        addWeeks,
        endOfWeek,
        format,
        getWeek,
        isAfter,
        isBefore,
        parseISO,
        startOfDay,
        startOfWeek,
    } from 'date-fns';
import
    {
        AlertTriangle,
        ArrowRight,
        Calendar,
        CalendarDays,
        CheckCircle2,
        Clock,
        MapPin,
        Package,
        TrendingUp,
        Truck,
    } from 'lucide-react';
import { useMemo } from 'react';

interface WeeklySummaryProps {
  loads: Load[];
}

interface RouteSummary {
  route: string;
  count: number;
  origin: string;
  destination: string;
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  totalLoads: number;
  scheduled: number;
  inTransit: number;
  delivered: number;
  pending: number;
  upcomingLoads: number;
  overdueLoads: number;
  topRoutes: RouteSummary[];
  uniqueDrivers: number;
  uniqueTrucks: number;
  completionRate: number;
}

function calculateWeekData(loads: Load[], weekStart: Date, weekEnd: Date, today: Date): Omit<WeekData, 'weekNumber' | 'weekStart' | 'weekEnd'> {
  // Normalize week boundaries to start/end of day for accurate comparison
  const weekStartNormalized = startOfDay(weekStart);
  const weekEndNormalized = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  // Filter loads for this week based on loading_date
  // A load belongs to a week if its loading_date falls within that week
  const weekLoads = loads.filter((load) => {
    try {
      const loadDate = startOfDay(parseISO(load.loading_date));
      // Check if load date is >= week start AND <= week end
      return (
        (loadDate >= weekStartNormalized && loadDate <= weekEndNormalized) ||
        loadDate.getTime() === weekStartNormalized.getTime() ||
        loadDate.getTime() === weekEndNormalized.getTime()
      );
    } catch {
      return false;
    }
  });

  // Status breakdown
  const scheduled = weekLoads.filter((l) => l.status === 'scheduled');
  const inTransit = weekLoads.filter((l) => l.status === 'in-transit');
  const delivered = weekLoads.filter((l) => l.status === 'delivered');
  const pending = weekLoads.filter((l) => l.status === 'pending');

  // Normalize today for date-only comparisons
  const todayNormalized = startOfDay(today);

  // Upcoming loads (scheduled for future days within this week)
  const upcomingLoads = weekLoads.filter((load) => {
    try {
      const loadDate = startOfDay(parseISO(load.loading_date));
      return isAfter(loadDate, todayNormalized) && load.status === 'scheduled';
    } catch {
      return false;
    }
  });

  // Overdue loads (scheduled for past days but not delivered)
  const overdueLoads = weekLoads.filter((load) => {
    try {
      const loadDate = startOfDay(parseISO(load.loading_date));
      return isBefore(loadDate, todayNormalized) && load.status !== 'delivered';
    } catch {
      return false;
    }
  });

  // Route analysis
  const routeMap = new Map<string, RouteSummary>();
  weekLoads.forEach((load) => {
    const routeKey = `${load.origin} → ${load.destination}`;
    const existing = routeMap.get(routeKey);
    if (existing) {
      existing.count++;
    } else {
      routeMap.set(routeKey, {
        route: routeKey,
        count: 1,
        origin: load.origin,
        destination: load.destination,
      });
    }
  });

  const topRoutes = Array.from(routeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Unique drivers
  const uniqueDrivers = new Set(
    weekLoads.filter((l) => l.driver?.name).map((l) => l.driver!.name)
  );

  // Unique trucks
  const uniqueTrucks = new Set(
    weekLoads.filter((l) => l.fleet_vehicle?.vehicle_id).map((l) => l.fleet_vehicle!.vehicle_id)
  );

  // Completion rate
  const completionRate =
    weekLoads.length > 0
      ? Math.round((delivered.length / weekLoads.length) * 100)
      : 0;

  return {
    totalLoads: weekLoads.length,
    scheduled: scheduled.length,
    inTransit: inTransit.length,
    delivered: delivered.length,
    pending: pending.length,
    upcomingLoads: upcomingLoads.length,
    overdueLoads: overdueLoads.length,
    topRoutes,
    uniqueDrivers: uniqueDrivers.size,
    uniqueTrucks: uniqueTrucks.size,
    completionRate,
  };
}

export function WeeklySummary({ loads }: WeeklySummaryProps) {
  const { currentWeek, nextWeek } = useMemo(() => {
    const today = new Date();
    
    // Week options: Monday start, ISO week numbering (first week contains Jan 4)
    const weekOptions = { weekStartsOn: 1 as const, firstWeekContainsDate: 4 as const };
    
    // Current week - determined by today's date
    const currentWeekStart = startOfWeek(today, weekOptions);
    const currentWeekEnd = endOfWeek(today, weekOptions);
    const currentWeekNumber = getWeek(today, weekOptions);
    
    // Next week - one week after current
    const nextWeekDate = addWeeks(today, 1);
    const nextWeekStart = startOfWeek(nextWeekDate, weekOptions);
    const nextWeekEnd = endOfWeek(nextWeekDate, weekOptions);
    const nextWeekNumber = getWeek(nextWeekDate, weekOptions);

    // Calculate data for each week based on load dates
    const currentWeekData = calculateWeekData(loads, currentWeekStart, currentWeekEnd, today);
    const nextWeekData = calculateWeekData(loads, nextWeekStart, nextWeekEnd, today);

    return {
      currentWeek: {
        weekNumber: currentWeekNumber,
        weekStart: currentWeekStart,
        weekEnd: currentWeekEnd,
        ...currentWeekData,
      },
      nextWeek: {
        weekNumber: nextWeekNumber,
        weekStart: nextWeekStart,
        weekEnd: nextWeekEnd,
        ...nextWeekData,
      },
    };
  }, [loads]);

  const renderWeekContent = (weekData: WeekData, isCurrentWeek: boolean) => (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isCurrentWeek ? "bg-primary/10" : "bg-accent/10"
          )}>
            {isCurrentWeek ? (
              <Calendar className="h-5 w-5 text-primary" />
            ) : (
              <CalendarDays className="h-5 w-5 text-accent" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Week {weekData.weekNumber} {isCurrentWeek ? '(Current)' : '(Upcoming)'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {format(weekData.weekStart, 'MMM d')} -{' '}
              {format(weekData.weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">
                {weekData.totalLoads}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Total Loads</p>
          </div>

          <div className="rounded-lg bg-status-scheduled-bg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-status-scheduled" />
              <span className="text-2xl font-bold text-status-scheduled">
                {weekData.scheduled}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </div>

          <div className="rounded-lg bg-status-transit-bg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-status-transit" />
              <span className="text-2xl font-bold text-status-transit">
                {weekData.inTransit}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </div>

          <div className="rounded-lg bg-status-delivered-bg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-status-delivered" />
              <span className="text-2xl font-bold text-status-delivered">
                {weekData.delivered}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isCurrentWeek ? 'Completion Rate' : 'Scheduled Loads'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCurrentWeek ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {weekData.completionRate}%
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">
                    of loads delivered
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-status-delivered transition-all duration-500"
                    style={{ width: `${weekData.completionRate}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {weekData.totalLoads}
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  loads planned
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {isCurrentWeek ? 'Resources This Week' : 'Resources Needed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {weekData.uniqueTrucks}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isCurrentWeek ? 'Trucks Active' : 'Trucks Assigned'}
                </p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {weekData.uniqueDrivers}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isCurrentWeek ? 'Drivers Active' : 'Drivers Assigned'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {isCurrentWeek ? 'Week Alerts' : 'Week Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isCurrentWeek ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Upcoming</span>
                    <Badge
                      variant="outline"
                      className="bg-status-scheduled-bg text-status-scheduled"
                    >
                      {weekData.upcomingLoads}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Needs Attention
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        weekData.overdueLoads > 0
                          ? 'bg-status-pending-bg text-status-pending'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {weekData.overdueLoads}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      {weekData.pending}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Scheduled</span>
                    <Badge
                      variant="outline"
                      className="bg-status-scheduled-bg text-status-scheduled"
                    >
                      {weekData.scheduled}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Assignment</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        weekData.pending > 0
                          ? 'bg-status-pending-bg text-status-pending'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {weekData.pending}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Planned</span>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      {weekData.totalLoads}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      {weekData.topRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {isCurrentWeek ? 'Top Routes This Week' : 'Planned Routes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weekData.topRoutes.map((route, index) => (
                <div
                  key={route.route}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {route.origin}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {route.destination}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">{route.count} loads</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="current" className="gap-2">
          <Calendar className="h-4 w-4" />
          Week {currentWeek.weekNumber}
        </TabsTrigger>
        <TabsTrigger value="next" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Week {nextWeek.weekNumber}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="current">
        {renderWeekContent(currentWeek, true)}
      </TabsContent>
      <TabsContent value="next">
        {renderWeekContent(nextWeek, false)}
      </TabsContent>
    </Tabs>
  );
}