import { StatusBadge } from '@/components/loads/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientLoads } from '@/hooks/useClientLoads';
import type { Load } from '@/hooks/useLoads';
import { getLocationDisplayName, safeFormatDate } from '@/lib/utils';
import { parseISO } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type StatusFilter = 'all' | 'scheduled' | 'in-transit' | 'delivered' | 'pending';

export default function ClientLoadsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: loads = [], isLoading } = useClientLoads(clientId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filter loads
  const filteredLoads = useMemo(() => {
    let result = [...loads];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((load) => {
        const origin = getLocationDisplayName(load.origin).toLowerCase();
        const destination = getLocationDisplayName(load.destination).toLowerCase();
        return (
          load.load_id.toLowerCase().includes(query) ||
          origin.includes(query) ||
          destination.includes(query) ||
          load.fleet_vehicle?.vehicle_id?.toLowerCase().includes(query) ||
          load.driver?.name?.toLowerCase().includes(query)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((load) => load.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      result = result.filter((load) => {
        try {
          const loadDate = parseISO(load.loading_date);
          if (dateFilter === 'today') {
            return loadDate >= today;
          } else if (dateFilter === 'week') {
            return loadDate >= weekAgo;
          } else if (dateFilter === 'month') {
            return loadDate >= monthAgo;
          }
        } catch {
          return false;
        }
        return true;
      });
    }

    return result;
  }, [loads, searchQuery, statusFilter, dateFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: loads.length,
      scheduled: loads.filter((l) => l.status === 'scheduled').length,
      inTransit: loads.filter((l) => l.status === 'in-transit').length,
      delivered: loads.filter((l) => l.status === 'delivered').length,
    };
  }, [loads]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFilter !== 'all';

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            Your Loads
          </h2>
          <p className="text-sm text-muted-foreground">
            View and track all your shipments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Loads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                {stats.total}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                {stats.inTransit}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {stats.delivered}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Loads
                </CardTitle>
                <CardDescription>Search and filter your shipments</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by load ID, origin, destination..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dateFilter}
                onValueChange={(value) => setDateFilter(value as typeof dateFilter)}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loads Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredLoads.length} {filteredLoads.length === 1 ? 'Load' : 'Loads'}
              {hasActiveFilters && ' (filtered)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredLoads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                {hasActiveFilters ? (
                  <>
                    <p className="font-medium">No loads match your filters</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No loads yet</p>
                    <p className="text-sm">Your shipments will appear here</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Load ID</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Loading Date</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoads.map((load) => (
                        <LoadRow key={load.id} load={load} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {filteredLoads.map((load) => (
                    <MobileLoadCard key={load.id} load={load} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

function LoadRow({ load }: { load: Load }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-purple-500" />
          <span className="font-medium">{load.load_id}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm">
          <span>{origin}</span>
          <span className="text-muted-foreground">→</span>
          <span>{destination}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {safeFormatDate(load.loading_date, 'dd MMM yyyy')}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {safeFormatDate(load.offloading_date, 'dd MMM yyyy')}
        </div>
      </TableCell>
      <TableCell>
        {load.fleet_vehicle ? (
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{load.fleet_vehicle.vehicle_id}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {load.driver ? (
          <span>{load.driver.name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={load.status} />
      </TableCell>
    </TableRow>
  );
}

function MobileLoadCard({ load }: { load: Load }) {
  const origin = getLocationDisplayName(load.origin);
  const destination = getLocationDisplayName(load.destination);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-sm">{load.load_id}</span>
        </div>
        <StatusBadge status={load.status} />
      </div>
      <div className="text-sm text-muted-foreground truncate">
        {origin} → {destination}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Load: {safeFormatDate(load.loading_date, 'dd MMM')}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Del: {safeFormatDate(load.offloading_date, 'dd MMM')}
        </div>
        {load.fleet_vehicle && (
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {load.fleet_vehicle.vehicle_id}
          </div>
        )}
        {load.driver && (
          <span>{load.driver.name}</span>
        )}
      </div>
    </div>
  );
}