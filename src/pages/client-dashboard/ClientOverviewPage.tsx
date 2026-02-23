import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient, useClientActiveLoads, useClientLoads } from '@/hooks/useClientLoads';
import type { Load } from '@/hooks/useLoads';
import { getLocationDisplayName, cn, safeFormatDate } from '@/lib/utils';
import {
  endOfMonth,
  endOfWeek,
  formatDistanceToNow,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  ArrowRight,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  Navigation,
  Package,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function ClientOverviewPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: allLoads = [], isLoading: loadsLoading } = useClientLoads(clientId);
  const { data: activeLoads = [] } = useClientActiveLoads(clientId);

  const isLoading = clientLoading || loadsLoading;

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisWeekLoads = allLoads.filter((l) => {
      const date = parseISO(l.loading_date);
      return date >= weekStart && date <= weekEnd;
    });

    const thisMonthLoads = allLoads.filter((l) => {
      const date = parseISO(l.loading_date);
      return date >= monthStart && date <= monthEnd;
    });

    return {
      total: allLoads.length,
      delivered: allLoads.filter((l) => l.status === 'delivered').length,
      inTransit: allLoads.filter((l) => l.status === 'in-transit').length,
      scheduled: allLoads.filter((l) => l.status === 'scheduled' || l.status === 'pending').length,
      thisWeek: thisWeekLoads.length,
      thisMonth: thisMonthLoads.length,
      deliveredThisMonth: thisMonthLoads.filter((l) => l.status === 'delivered').length,
    };
  }, [allLoads]);

  // Calculate delivery rate
  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;

  // Recent activity
  const recentActivity = useMemo(() => {
    return allLoads
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [allLoads]);

  // Upcoming scheduled
  const upcomingLoads = useMemo(() => {
    const now = new Date();
    return allLoads
      .filter((l) => l.status === 'scheduled' && parseISO(l.loading_date) >= now)
      .sort((a, b) => new Date(a.loading_date).getTime() - new Date(b.loading_date).getTime())
      .slice(0, 3);
  }, [allLoads]);

  return (
    <div className="space-y-6">
        {/* Welcome Section */}
        {isLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Welcome back{client?.contact_person ? `, ${client.contact_person.split(' ')[0]}` : ''}!
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Here's an overview of your shipment activity with {client?.name || 'your account'}
                  </p>
                </div>
                <div className="hidden md:block">
                  <Package className="h-16 w-16 text-purple-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Shipments"
            value={stats.total}
            icon={Package}
            color="purple"
            loading={isLoading}
          />
          <StatsCard
            title="In Transit"
            value={stats.inTransit}
            icon={Truck}
            color="blue"
            loading={isLoading}
          />
          <StatsCard
            title="Delivered"
            value={stats.delivered}
            icon={CheckCircle2}
            color="green"
            loading={isLoading}
          />
          <StatsCard
            title="Scheduled"
            value={stats.scheduled}
            icon={Clock}
            color="amber"
            loading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Deliveries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-blue-500" />
                    Active Deliveries
                  </CardTitle>
                  <CardDescription>Shipments currently in progress</CardDescription>
                </div>
                <Link to={`/customers/${clientId}/deliveries`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : activeLoads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active deliveries right now</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeLoads.slice(0, 4).map((load) => (
                    <ActiveLoadItem key={load.id} load={load} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Scheduled */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-500" />
                    Upcoming Shipments
                  </CardTitle>
                  <CardDescription>Next scheduled deliveries</CardDescription>
                </div>
                <Link to={`/customers/${clientId}/loads`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : upcomingLoads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming shipments scheduled</p>
                </div>
              ) : (
                <div className="divide-y">
                  {upcomingLoads.map((load) => (
                    <UpcomingLoadItem key={load.id} load={load} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Delivery Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Delivery Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">{deliveryRate}%</div>
                    <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">This Week</span>
                        <span className="font-medium">{stats.thisWeek} loads</span>
                      </div>
                      <Progress value={stats.thisWeek > 0 ? 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">This Month</span>
                        <span className="font-medium">{stats.thisMonth} loads</span>
                      </div>
                      <Progress value={stats.thisMonth > 0 ? 100 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Delivered This Month</span>
                        <span className="font-medium">{stats.deliveredThisMonth}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates on your shipments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentActivity.map((load) => (
                    <RecentActivityItem key={load.id} load={load} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: typeof Package;
  color: 'purple' | 'blue' | 'green' | 'amber';
  loading?: boolean;
}) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveLoadItem({ load }: { load: Load }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);

  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-medium text-sm">{load.load_id}</p>
          <p className="text-xs text-muted-foreground">
            {origin} → {destination}
          </p>
        </div>
      </div>
      <Badge variant={load.status === 'in-transit' ? 'default' : 'outline'}>{load.status}</Badge>
    </div>
  );
}

function UpcomingLoadItem({ load }: { load: Load }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);

  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="font-medium text-sm">{load.load_id}</p>
          <p className="text-xs text-muted-foreground">
            {origin} → {destination}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{safeFormatDate(load.loading_date, 'dd MMM')}</p>
        <p className="text-xs text-muted-foreground">
          {(() => { try { return formatDistanceToNow(parseISO(load.loading_date), { addSuffix: true }); } catch { return '—'; } })()}
        </p>
      </div>
    </div>
  );
}

function RecentActivityItem({ load }: { load: Load }) {
  const getStatusIcon = () => {
    switch (load.status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in-transit':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="text-sm">
            <span className="font-medium">{load.load_id}</span>
            <span className="text-muted-foreground"> • {load.status}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {getLocationDisplayName(load.origin)} → {getLocationDisplayName(load.destination)}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(parseISO(load.updated_at), { addSuffix: true })}
      </span>
    </div>
  );
}