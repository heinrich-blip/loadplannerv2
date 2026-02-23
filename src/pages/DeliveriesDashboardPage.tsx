import { MainLayout } from "@/components/layout/MainLayout";
import { StatusBadge } from "@/components/loads/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import
  {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip";
import { useCustomLocations } from "@/hooks/useCustomLocations";
import { useDrivers } from "@/hooks/useDrivers";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { useGeofenceMonitor } from "@/hooks/useGeofenceMonitor";
import { type Load, useLoads } from "@/hooks/useLoads";
import
  {
    calculateDepotETA,
    calculateDepotTripProgress,
    customLocationToDepot,
    findDepotByName,
  } from "@/lib/depots";
import
  {
    formatLastConnected,
    type TelematicsAsset,
  } from "@/lib/telematicsGuru";
import { parseTimeWindow } from "@/lib/timeWindow";
import { cn, getLocationDisplayName } from "@/lib/utils";
import { endOfWeek, format, formatDistanceToNow, parseISO, startOfWeek } from "date-fns";
import
  {
    AlertCircle,
    AlertTriangle,
    Box,
    Calendar,
    CheckCircle2,
    Clock,
    Info,
    MapPin,
    Navigation,
    Package,
    RefreshCw,
    Route,
    Signal,
    SignalHigh,
    SignalLow,
    SignalMedium,
    Timer,
    Weight,
  } from "lucide-react";
import { useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface LoadWithETA extends Load {
  telematicsAsset?: TelematicsAsset | null;
  lastUpdate?: string;
  progressData?: {
    progress: number;
    totalDistance: number;
    distanceTraveled: number;
    distanceRemaining: number;
    etaFormatted: string;
    durationFormatted: string;
    originName?: string;
    destinationName?: string;
    isAtOrigin?: boolean;
    isAtDestination?: boolean;
    nearestDepot?: string | null;
  } | null;
  truckPosition?: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    lastUpdate: string;
    isMoving: boolean;
  } | null;
  isTrackingActive?: boolean;
  isAtLoadOrigin?: boolean;
}

interface TruckWithLoads {
  vehicleId: string;
  vehicleName: string;
  vehicleType?: string;
  vehicleMakeModel?: string;
  vehicleCapacity?: number;
  driverId?: string;
  driverName?: string;
  driverContact?: string;
  driverPhotoUrl?: string;
  telematicsAsset?: TelematicsAsset | null;
  loads: LoadWithETA[];
  currentLoad?: LoadWithETA;
  isMoving: boolean;
  lastUpdate?: string;
  lastUpdateDate?: Date;
  currentLocation?: string;
  speed?: number;
  gpsSignalStrength: "strong" | "medium" | "weak" | "none";
  totalLoadsToday: number;
  completedLoadsToday: number;
  isStale: boolean;
  staleMinutes?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getGpsSignalStrength(
  lastConnectedUtc?: string
): "strong" | "medium" | "weak" | "none" {
  if (!lastConnectedUtc) return "none";
  const now = new Date();
  const lastUpdate = new Date(lastConnectedUtc);
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  if (diffMinutes < 5) return "strong";
  if (diffMinutes < 15) return "medium";
  if (diffMinutes < 60) return "weak";
  return "none";
}

function formatCargoType(cargoType: string): string {
  const map: Record<string, string> = {
    VanSalesRetail: "Van Sales",
    Retail: "Retail",
    Vendor: "Vendor",
    RetailVendor: "Retail/Vendor",
    Fertilizer: "Fertilizer",
    BV: "BV",
    CBC: "CBC",
    Packaging: "Packaging",
  };
  return map[cargoType] || cargoType;
}

function extractVehicleNumber(vehicleId: string): number {
  const match = vehicleId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DeliveriesDashboardPage() {
  const { data: loads = [], isLoading: loadsLoading } = useLoads();
  const { data: fleetVehicles = [] } = useFleetVehicles();
  const { data: drivers = [] } = useDrivers();
  const { data: customLocations = [] } = useCustomLocations();

  // Convert custom locations to Depot shape so they work with distance calculations
  const extraDepots = useMemo(
    () => customLocations.map(customLocationToDepot),
    [customLocations]
  );

  // Use the global geofence monitor for telematics data and auto-capture
  const {
    telematicsAssets: _telematicsAssets,
    telematicsLoading,
    telematicsAuthError,
    lastRefresh,
    loadsWithAssets,
    refetch,
  } = useGeofenceMonitor();

  // Enrich loads with progress data and truck positions for the deliveries UI
  const loadsWithETA: LoadWithETA[] = useMemo(() => {
    // Build per-vehicle-origin current load map
    const loadsByVehicleOrigin = new Map<string, typeof loadsWithAssets>();
    for (const load of loadsWithAssets) {
      const vehicleId = load.fleet_vehicle?.vehicle_id || "unassigned";
      const originKey = `${vehicleId}::${load.origin}`;
      if (!loadsByVehicleOrigin.has(originKey)) {
        loadsByVehicleOrigin.set(originKey, []);
      }
      loadsByVehicleOrigin.get(originKey)!.push(load);
    }
    const currentLoadByVehicle = new Map<string, string>();
    for (const [originKey, vehicleLoads] of loadsByVehicleOrigin) {
      const sortedLoads = [...vehicleLoads].sort(
        (a, b) => parseISO(a.loading_date).getTime() - parseISO(b.loading_date).getTime()
      );
      const inTransitLoad = sortedLoads.find((l) => l.status === "in-transit");
      if (inTransitLoad) {
        currentLoadByVehicle.set(originKey, inTransitLoad.id);
      } else {
        const scheduledLoads = sortedLoads.filter((l) => l.status === "scheduled");
        if (scheduledLoads.length > 0) {
          currentLoadByVehicle.set(originKey, scheduledLoads[0].id);
        }
      }
    }

    return loadsWithAssets.map((load) => {
      const vehicleId = load.fleet_vehicle?.vehicle_id || "unassigned";
      const originKey = `${vehicleId}::${load.origin}`;
      const currentLoadId = currentLoadByVehicle.get(originKey);
      const isCurrentLoad = currentLoadId === load.id;
      const isInTransit = load.status === "in-transit";
      const isTrackingActive = isInTransit || (isCurrentLoad && load.isAtLoadOrigin);
      let progressData = null;
      let truckPosition = null;
      const originDepot = findDepotByName(load.origin, extraDepots);
      const destDepot = findDepotByName(load.destination, extraDepots);
      if (originDepot && destDepot) {
        const telematicsAsset = load.telematicsAsset;
        if (telematicsAsset?.lastLatitude && telematicsAsset?.lastLongitude) {
          truckPosition = {
            latitude: telematicsAsset.lastLatitude,
            longitude: telematicsAsset.lastLongitude,
            speed: telematicsAsset.speedKmH || 0,
            heading: telematicsAsset.heading || 0,
            lastUpdate: telematicsAsset.lastConnectedUtc
              ? formatLastConnected(telematicsAsset.lastConnectedUtc)
              : "Unknown",
            isMoving: telematicsAsset.speedKmH > 5,
          };
          if (isTrackingActive) {
            const tripProgress = calculateDepotTripProgress(
              originDepot,
              destDepot,
              telematicsAsset.lastLatitude,
              telematicsAsset.lastLongitude
            );
            const speed = telematicsAsset.speedKmH > 10 ? telematicsAsset.speedKmH : 60;
            const eta = calculateDepotETA(tripProgress.distanceRemaining, speed);
            progressData = {
              progress: tripProgress.progress,
              totalDistance: tripProgress.totalDistance,
              distanceTraveled: tripProgress.distanceTraveled,
              distanceRemaining: tripProgress.distanceRemaining,
              etaFormatted: eta.etaFormatted,
              durationFormatted: eta.durationFormatted,
              originName: originDepot.name,
              destinationName: destDepot.name,
              isAtOrigin: tripProgress.isAtOrigin,
              isAtDestination: tripProgress.isAtDestination,
              nearestDepot: tripProgress.nearestDepot?.name || null,
            };
          } else {
            const tripProgress = calculateDepotTripProgress(
              originDepot,
              destDepot,
              originDepot.latitude,
              originDepot.longitude
            );
            const eta = calculateDepotETA(tripProgress.totalDistance, 60);
            progressData = {
              progress: 0,
              totalDistance: tripProgress.totalDistance,
              distanceTraveled: 0,
              distanceRemaining: tripProgress.totalDistance,
              etaFormatted: "--:--",
              durationFormatted: eta.durationFormatted,
              originName: originDepot.name,
              destinationName: destDepot.name,
              isAtOrigin: false,
              isAtDestination: false,
              nearestDepot: null,
            };
          }
        }
      }
      return {
        ...load,
        progressData,
        truckPosition,
        isTrackingActive,
      };
    });
  }, [loadsWithAssets, extraDepots]);

  const activeLoads = useMemo(() => {
    // Only include current week's loads (Mon-Sun) plus any in-transit loads
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return [...loadsWithETA]
      .filter((l) => {
        // Always include in-transit loads regardless of date
        if (l.status === "in-transit") return true;
        const loadDate = parseISO(l.loading_date);
        return loadDate >= weekStart && loadDate <= weekEnd;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.loading_date).getTime();
        const dateB = parseISO(b.loading_date).getTime();
        return dateA - dateB;
      });
  }, [loadsWithETA]);

  const trucksWithLoads: TruckWithLoads[] = useMemo(() => {
    const truckMap = new Map<string, TruckWithLoads>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLoads = loads.filter((l) => {
      const loadDate = parseISO(l.loading_date);
      loadDate.setHours(0, 0, 0, 0);
      return loadDate.getTime() === today.getTime();
    });

    for (const load of activeLoads) {
      const vehicleId = load.fleet_vehicle?.vehicle_id || "unassigned";
      const vehicleName = load.fleet_vehicle?.vehicle_id || "Unassigned";
      const vehicleDetails = fleetVehicles.find((v) => v.vehicle_id === vehicleId);
      const driverDetails = load.driver?.id ? drivers.find((d) => d.id === load.driver?.id) : null;

      if (!truckMap.has(vehicleId)) {
        const vehicleTodayLoads = todayLoads.filter((l) => l.fleet_vehicle?.vehicle_id === vehicleId);
        const completedToday = vehicleTodayLoads.filter((l) => l.status === "delivered").length;

        const lastConnectedUtc = load.telematicsAsset?.lastConnectedUtc;
        const staleMinutes = lastConnectedUtc 
          ? Math.floor((new Date().getTime() - new Date(lastConnectedUtc).getTime()) / (1000 * 60))
          : undefined;
        const isStale = staleMinutes !== undefined && staleMinutes > 30;

        truckMap.set(vehicleId, {
          vehicleId,
          vehicleName,
          vehicleType: vehicleDetails?.type || load.fleet_vehicle?.type,
          vehicleMakeModel: vehicleDetails?.make_model || undefined,
          vehicleCapacity: vehicleDetails?.capacity,
          driverId: load.driver?.id,
          driverName: load.driver?.name,
          driverContact: load.driver?.contact,
          driverPhotoUrl: driverDetails?.photo_url || undefined,
          telematicsAsset: load.telematicsAsset,
          loads: [],
          isMoving: load.telematicsAsset?.speedKmH ? load.telematicsAsset.speedKmH > 5 : false,
          lastUpdate: load.lastUpdate,
          lastUpdateDate: load.telematicsAsset?.lastConnectedUtc
            ? new Date(load.telematicsAsset.lastConnectedUtc)
            : undefined,
          currentLocation: load.progressData?.nearestDepot || undefined,
          speed: load.telematicsAsset?.speedKmH,
          gpsSignalStrength: getGpsSignalStrength(load.telematicsAsset?.lastConnectedUtc),
          totalLoadsToday: vehicleTodayLoads.length,
          completedLoadsToday: completedToday,
          isStale,
          staleMinutes,
        });
      }

      const truck = truckMap.get(vehicleId)!;
      truck.loads.push(load);

      if (load.telematicsAsset) {
        truck.telematicsAsset = load.telematicsAsset;
        truck.isMoving = load.telematicsAsset.speedKmH > 5;
        truck.lastUpdate = load.lastUpdate;
        truck.speed = load.telematicsAsset.speedKmH;
        truck.gpsSignalStrength = getGpsSignalStrength(load.telematicsAsset.lastConnectedUtc);
        truck.lastUpdateDate = load.telematicsAsset.lastConnectedUtc
          ? new Date(load.telematicsAsset.lastConnectedUtc)
          : undefined;
        // Update stale status
        const staleMinutes = load.telematicsAsset.lastConnectedUtc
          ? Math.floor((new Date().getTime() - new Date(load.telematicsAsset.lastConnectedUtc).getTime()) / (1000 * 60))
          : undefined;
        truck.staleMinutes = staleMinutes;
        truck.isStale = staleMinutes !== undefined && staleMinutes > 30;
      }
    }

    for (const truck of truckMap.values()) {
      truck.loads.sort(
        (a, b) => parseISO(a.loading_date).getTime() - parseISO(b.loading_date).getTime()
      );
      truck.currentLoad = truck.loads.find((l) => l.status === "in-transit") || truck.loads[0];
    }

    return Array.from(truckMap.values()).sort((a, b) => {
      if (a.vehicleId === "unassigned") return 1;
      if (b.vehicleId === "unassigned") return -1;
      const aNum = extractVehicleNumber(a.vehicleId);
      const bNum = extractVehicleNumber(b.vehicleId);
      if (aNum !== bNum) return aNum - bNum;
      return a.vehicleId.localeCompare(b.vehicleId);
    });
  }, [activeLoads, fleetVehicles, drivers, loads]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const weekLoads = loads.filter((l) => {
      const loadDate = parseISO(l.loading_date);
      return loadDate >= weekStart && loadDate <= weekEnd;
    });

    return {
      totalTrucks: trucksWithLoads.length,
      inTransitLoads: activeLoads.filter((l) => l.status === "in-transit").length,
      scheduledLoads: activeLoads.filter((l) => l.status === "scheduled").length,
      movingTrucks: trucksWithLoads.filter((t) => t.isMoving).length,
      deliveredThisWeek: weekLoads.filter((l) => l.status === "delivered").length,
      totalWeek: weekLoads.length,
    };
  }, [trucksWithLoads, activeLoads, loads]);

  // Group trucks by date category: Today, Upcoming, Past
  const groupedTrucks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTrucks: TruckWithLoads[] = [];
    const upcomingTrucks: TruckWithLoads[] = [];
    const pastTrucks: TruckWithLoads[] = [];

    for (const truck of trucksWithLoads) {
      // Any truck with an in-transit load always goes to "Today"
      const hasInTransit = truck.loads.some((l) => l.status === "in-transit");
      if (hasInTransit) {
        todayTrucks.push(truck);
        continue;
      }

      // Check if any load falls on today
      const hasTodayLoad = truck.loads.some((l) => {
        const d = parseISO(l.loading_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
      if (hasTodayLoad) {
        todayTrucks.push(truck);
        continue;
      }

      // Check if any load is upcoming (future)
      const hasUpcomingLoad = truck.loads.some((l) => {
        const d = parseISO(l.loading_date);
        d.setHours(0, 0, 0, 0);
        return d >= tomorrow;
      });
      if (hasUpcomingLoad) {
        upcomingTrucks.push(truck);
        continue;
      }

      // All loads are in the past
      pastTrucks.push(truck);
    }

    // Sort each group numerically by vehicle number (small to big)
    const sortByVehicleNumber = (a: TruckWithLoads, b: TruckWithLoads) => {
      if (a.vehicleId === "unassigned") return 1;
      if (b.vehicleId === "unassigned") return -1;
      const aNum = extractVehicleNumber(a.vehicleId);
      const bNum = extractVehicleNumber(b.vehicleId);
      if (aNum !== bNum) return aNum - bNum;
      return a.vehicleId.localeCompare(b.vehicleId);
    };
    todayTrucks.sort(sortByVehicleNumber);
    upcomingTrucks.sort(sortByVehicleNumber);

    // Keep only the 3 most recent past trucks, then sort numerically
    pastTrucks.sort((a, b) => {
      const latestA = Math.max(...a.loads.map((l) => parseISO(l.loading_date).getTime()));
      const latestB = Math.max(...b.loads.map((l) => parseISO(l.loading_date).getTime()));
      return latestB - latestA;
    });
    const recentPastTrucks = pastTrucks.slice(0, 3);
    recentPastTrucks.sort(sortByVehicleNumber);

    return { todayTrucks, upcomingTrucks, pastTrucks: recentPastTrucks };
  }, [trucksWithLoads]);

  if (loadsLoading) {
    return (
      <MainLayout title="Deliveries Dashboard">
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Deliveries Dashboard">
      <TooltipProvider>
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950">
          {telematicsAuthError && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  GPS tracking unavailable. Please authenticate to enable live tracking.
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/tracking">Setup Tracking</a>
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "dd MMM")} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "dd MMM yyyy")} 
                    <span className="text-emerald-600 dark:text-emerald-400 ml-2">• Live Tracking</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatCard icon={<Route className="h-4 w-4" />} value={stats.inTransitLoads} label="In Transit" color="blue" />
                  <StatCard icon={<Calendar className="h-4 w-4" />} value={stats.scheduledLoads} label="Scheduled" color="purple" />
                  <StatCard icon={<Navigation className="h-4 w-4" />} value={stats.movingTrucks} label="Moving" color="green" />
                  <StatCard icon={<CheckCircle2 className="h-4 w-4" />} value={stats.deliveredThisWeek} label="Delivered" color="amber" />

                  <Separator orientation="vertical" className="h-10 mx-3" />

                  <div className="flex flex-col items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refetch}
                      disabled={telematicsLoading}
                      className="gap-2 shadow-sm hover:shadow-md transition-all"
                    >
                      <RefreshCw className={cn("h-4 w-4", telematicsLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    {lastRefresh && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                        {format(lastRefresh, "HH:mm:ss")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/70 dark:to-slate-900/50 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-6">
                <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[10px]">Status:</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">In Transit</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30">
                  <MapPin className="h-3 w-3 text-violet-500" />
                  <span className="text-violet-600 dark:text-violet-400 font-medium">Loading</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30">
                  <MapPin className="h-3 w-3 text-purple-500" />
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Offloading</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                  <Calendar className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Delivered</span>
                </div>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1" title="GPS Signal Strong">
                    <SignalHigh className="h-3 w-3 text-green-500" />
                  </div>
                  <div className="flex items-center gap-1" title="GPS Signal Medium">
                    <SignalMedium className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-1" title="GPS Signal Weak">
                    <SignalLow className="h-3 w-3 text-red-500" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30" title="Stale - No update for 30+ min">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 font-semibold">Stale</span>
                  </div>
                </div>
              </div>
              <span className="bg-slate-200/50 dark:bg-slate-700/50 px-3 py-1 rounded-full font-medium text-[10px]">
                {stats.totalTrucks} trucks • {stats.inTransitLoads + stats.scheduledLoads} loads • Auto-refresh 10s
              </span>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {trucksWithLoads.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      No Active Deliveries
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      All loads have been delivered or none are scheduled
                    </p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href="/loads">View All Loads</a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Today */}
                  {groupedTrucks.todayTrucks.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Today — {format(new Date(), "dd MMM yyyy")}
                        </h2>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                          {groupedTrucks.todayTrucks.length} {groupedTrucks.todayTrucks.length === 1 ? "truck" : "trucks"}
                        </Badge>
                      </div>
                      {groupedTrucks.todayTrucks.map((truck) => (
                        <TruckRow key={truck.vehicleId} truck={truck} />
                      ))}
                    </div>
                  )}

                  {/* Upcoming */}
                  {groupedTrucks.upcomingTrucks.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Upcoming
                        </h2>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                          {groupedTrucks.upcomingTrucks.length} {groupedTrucks.upcomingTrucks.length === 1 ? "truck" : "trucks"}
                        </Badge>
                      </div>
                      {groupedTrucks.upcomingTrucks.map((truck) => (
                        <TruckRow key={truck.vehicleId} truck={truck} />
                      ))}
                    </div>
                  )}

                  {/* Past Deliveries */}
                  {groupedTrucks.pastTrucks.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Recent Past Deliveries
                        </h2>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                          {groupedTrucks.pastTrucks.length} {groupedTrucks.pastTrucks.length === 1 ? "truck" : "trucks"}
                        </Badge>
                      </div>
                      {groupedTrucks.pastTrucks.map((truck) => (
                        <TruckRow key={truck.vehicleId} truck={truck} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "blue" | "purple" | "green" | "amber";
}) {
  const colors = {
    blue: "bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 dark:from-blue-950/60 dark:to-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30",
    purple: "bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-600 dark:from-purple-950/60 dark:to-purple-900/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30",
    green: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 dark:from-emerald-950/60 dark:to-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30",
    amber: "bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 dark:from-amber-950/60 dark:to-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30",
  };

  return (
    <div className={cn("px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200", colors[color])}>
      <div className="flex items-center gap-2.5">
        <div className="opacity-70">{icon}</div>
        <span className="text-2xl font-bold tracking-tight">{value}</span>
      </div>
      <span className="text-[11px] font-medium opacity-70 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ============================================================================
// TRUCK ROW
// ============================================================================

function TruckRow({ truck }: { truck: TruckWithLoads }) {
  const hasInTransit = truck.loads.some((l) => l.status === "in-transit");
  const isAtOrigin = truck.loads.some((l) => l.isAtLoadOrigin && l.status === "scheduled");

  const GpsIcon = () => {
    switch (truck.gpsSignalStrength) {
      case "strong":
        return <SignalHigh className="h-4 w-4 text-emerald-500" />;
      case "medium":
        return <SignalMedium className="h-4 w-4 text-amber-500" />;
      case "weak":
        return <SignalLow className="h-4 w-4 text-red-500" />;
      default:
        return <Signal className="h-4 w-4 text-slate-300" />;
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-xl",
        hasInTransit && "ring-2 ring-blue-500/70 shadow-lg shadow-blue-500/20",
        isAtOrigin && !hasInTransit && "ring-2 ring-purple-500/70 shadow-lg shadow-purple-500/20",
        !hasInTransit && !isAtOrigin && "hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700"
      )}
    >
      <div className="flex">
        {/* Truck Info */}
        <div
          className={cn(
            "w-60 flex-shrink-0 border-r border-slate-200/80 dark:border-slate-700/50",
            hasInTransit
              ? "bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-950/20 dark:to-slate-900"
              : isAtOrigin
              ? "bg-gradient-to-br from-purple-50 via-purple-50/50 to-white dark:from-purple-950/40 dark:via-purple-950/20 dark:to-slate-900"
              : "bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/70 dark:to-slate-900/50"
          )}
        >
          <div className="p-4">
            <div className="flex items-center justify-end mb-3">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <GpsIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    GPS: {truck.gpsSignalStrength}
                    {truck.lastUpdateDate && (
                      <div className="text-xs text-slate-400">
                        {formatDistanceToNow(truck.lastUpdateDate, { addSuffix: true })}
                      </div>
                    )}
                    {truck.isStale && (
                      <div className="text-xs text-red-400 mt-1">
                        ⚠️ Data is stale ({truck.staleMinutes}+ min old)
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
                {truck.isStale && (
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] gap-1 animate-pulse shadow-sm shadow-red-500/30">
                    <AlertCircle className="h-3 w-3" />
                    STALE
                  </Badge>
                )}
                {truck.isMoving && !truck.isStale && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] animate-pulse shadow-sm shadow-emerald-500/30">
                    MOVING
                  </Badge>
                )}
              </div>
            </div>

            <div className="mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{truck.vehicleName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {truck.driverName || "No Driver"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={cn(
                "p-2 rounded-lg flex items-center gap-2 shadow-sm border",
                truck.isStale 
                  ? "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200/50 dark:from-red-950/40 dark:to-red-900/20 dark:border-red-800/30" 
                  : "bg-white border-slate-200/60 dark:bg-slate-800/80 dark:border-slate-700/50"
              )}>
                <Navigation className={cn("h-3.5 w-3.5", truck.isMoving && !truck.isStale ? "text-emerald-500" : truck.isStale ? "text-red-400" : "text-slate-400")} />
                <span className={cn("font-bold", truck.isStale && "text-red-600 dark:text-red-400")}>
                  {truck.speed || 0} km/h
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/60 dark:bg-slate-800/80 dark:border-slate-700/50 flex items-center gap-2 shadow-sm">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-bold">
                  {truck.completedLoadsToday}/{truck.totalLoadsToday || truck.loads.length}
                </span>
              </div>
            </div>

            {truck.currentLocation && (
              <div className={cn(
                "mt-3 p-2 rounded-lg flex items-center gap-2 text-xs shadow-sm border",
                truck.isStale 
                  ? "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200/50 dark:from-red-950/40 dark:to-red-900/20 dark:border-red-800/30" 
                  : "bg-white border-slate-200/60 dark:bg-slate-800/80 dark:border-slate-700/50"
              )}>
                <MapPin className={cn("h-3.5 w-3.5 flex-shrink-0", truck.isStale ? "text-red-500" : "text-rose-500")} />
                <span className="truncate font-medium">{truck.currentLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Loads */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-950">
          <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/80 dark:to-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Route className="h-4 w-4 text-slate-500" />
              Delivery Sequence
            </div>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm">
              {truck.loads.length} {truck.loads.length === 1 ? "load" : "loads"}
            </Badge>
          </div>

          <ScrollArea className="w-full">
            <div className="flex p-5 gap-5">
              {truck.loads.map((load, loadIndex) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  isCurrent={truck.currentLoad?.id === load.id}
                  sequenceNumber={loadIndex + 1}
                  isLast={loadIndex === truck.loads.length - 1}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// LOAD CARD
// ============================================================================

function LoadCard({
  load,
  isCurrent,
  sequenceNumber,
  isLast,
}: {
  load: LoadWithETA;
  isCurrent: boolean;
  sequenceNumber: number;
  isLast: boolean;
}) {
  const isInTransit = load.status === "in-transit";
  const isDelivered = load.status === "delivered";
  const isTracking = load.isTrackingActive;
  const isWaiting = !isTracking && load.status === "scheduled";
  
  // Determine detailed status based on geofence timestamps
  const hasArrivedAtLoading = !!load.actual_loading_arrival;
  const hasDepartedLoading = !!load.actual_loading_departure;
  const hasArrivedAtOffloading = !!load.actual_offloading_arrival;
  const hasDepartedOffloading = !!load.actual_offloading_departure;
  
  // Determine current phase
  const isAtLoadingPoint = hasArrivedAtLoading && !hasDepartedLoading;
  const isAtOffloadingPoint = hasArrivedAtOffloading && !hasDepartedOffloading;

  // Get display status
  const getDetailedStatus = () => {
    if (hasDepartedOffloading || isDelivered) return { label: "DELIVERED", color: "emerald", icon: CheckCircle2 };
    if (isAtOffloadingPoint) return { label: "AT DEPOT - OFFLOADING", color: "purple", icon: MapPin };
    if (hasArrivedAtOffloading) return { label: "OFFLOADING", color: "purple", icon: Package };
    if (isInTransit || hasDepartedLoading) return { label: "IN TRANSIT", color: "blue", icon: Route };
    if (isAtLoadingPoint) return { label: "AT LOADING POINT", color: "violet", icon: MapPin };
    if (hasArrivedAtLoading) return { label: "LOADING", color: "violet", icon: Package };
    if (load.isAtLoadOrigin) return { label: "AT DEPOT", color: "purple", icon: MapPin };
    return { label: "SCHEDULED", color: "amber", icon: Calendar };
  };
  
  const detailedStatus = getDetailedStatus();
  const StatusIcon = detailedStatus.icon;

  // Parse planned times from time_window
  const tw = parseTimeWindow(load.time_window);

  // Compute variance between planned and actual times
  const computeCardVariance = (planned: string | undefined, actual: string | null | undefined) => {
    if (!planned || !actual) return null;
    const toMin = (t: string) => {
      const hm = t.match(/^(\d{1,2}):(\d{2})$/);
      if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
      const iso = t.match(/T(\d{2}):(\d{2})/);
      if (iso) return parseInt(iso[1], 10) * 60 + parseInt(iso[2], 10);
      return null;
    };
    const pMin = toMin(planned);
    const aMin = toMin(actual);
    if (pMin === null || aMin === null) return null;
    const diff = aMin - pMin;
    if (diff <= 0) return null; // Only flag late times
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(" ") + " late";
  };

  const lateLoadingArrival = computeCardVariance(tw.origin.plannedArrival, load.actual_loading_arrival);
  const lateLoadingDeparture = computeCardVariance(tw.origin.plannedDeparture, load.actual_loading_departure);
  const lateOffloadingArrival = computeCardVariance(tw.destination.plannedArrival, load.actual_offloading_arrival);
  const lateOffloadingDeparture = computeCardVariance(tw.destination.plannedDeparture, load.actual_offloading_departure);
  const hasAnyLateTime = !!(lateLoadingArrival || lateLoadingDeparture || lateOffloadingArrival || lateOffloadingDeparture);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return format(date, "dd MMM HH:mm");
    } catch {
      return null;
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Arrow connector to next card */}
      {!isLast && (
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex items-center z-10">
          <div className={cn(
            "w-5 h-0.5 rounded-full",
            isDelivered ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : isInTransit ? "bg-gradient-to-r from-blue-400 to-blue-500" : "bg-slate-300 dark:bg-slate-700"
          )} />
          <svg 
            className={cn(
              "h-4 w-4 -ml-1.5 drop-shadow-sm",
              isDelivered ? "text-emerald-500" : isInTransit ? "text-blue-500" : "text-slate-400 dark:text-slate-600"
            )} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              "w-[280px] flex-shrink-0 cursor-pointer transition-all duration-300 hover:shadow-xl border-slate-200/80 dark:border-slate-800",
              isCurrent && isInTransit && "ring-2 ring-blue-500/80 shadow-lg shadow-blue-500/20",
              isCurrent && !isInTransit && load.isAtLoadOrigin && "ring-2 ring-purple-500/80 shadow-lg shadow-purple-500/20",
              isDelivered && "ring-2 ring-emerald-500/80 shadow-md shadow-emerald-500/15",
              isWaiting && "opacity-80 hover:opacity-100"
            )}
          >
            <div
              className={cn(
                "h-1.5 w-full rounded-t-lg",
                hasAnyLateTime && "bg-gradient-to-r from-red-400 to-red-500",
                !hasAnyLateTime && isDelivered && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                !hasAnyLateTime && isInTransit && !isDelivered && "bg-gradient-to-r from-blue-400 to-blue-500",
                !hasAnyLateTime && isAtLoadingPoint && "bg-gradient-to-r from-violet-400 to-violet-500",
                !hasAnyLateTime && isAtOffloadingPoint && !isDelivered && "bg-gradient-to-r from-purple-400 to-purple-500",
                !hasAnyLateTime && load.isAtLoadOrigin && !isInTransit && !isDelivered && !isAtLoadingPoint && "bg-gradient-to-r from-purple-400 to-purple-500",
                !hasAnyLateTime && isWaiting && !isDelivered && "bg-gradient-to-r from-amber-300 to-amber-400"
              )}
            />

            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors",
                      isDelivered && "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/30 dark:text-emerald-300",
                      isInTransit && !isDelivered && "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/30 dark:text-blue-300",
                      isAtLoadingPoint && "bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 dark:from-violet-900/50 dark:to-violet-800/30 dark:text-violet-300",
                      isAtOffloadingPoint && !isDelivered && "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/50 dark:to-purple-800/30 dark:text-purple-300",
                      load.isAtLoadOrigin && !isInTransit && !isDelivered && !isAtLoadingPoint && "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/50 dark:to-purple-800/30 dark:text-purple-300",
                      isWaiting && !isDelivered && "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/50 dark:to-amber-800/30 dark:text-amber-300",
                      !isCurrent && !isWaiting && !isDelivered && !isAtLoadingPoint && !isAtOffloadingPoint && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : sequenceNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    {load.load_id}
                  </Badge>
                </div>
                <Badge className={cn(
                  "text-[10px] gap-1.5 px-2.5 py-1 rounded-full shadow-sm",
                  detailedStatus.color === "emerald" && "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
                  detailedStatus.color === "blue" && "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
                  detailedStatus.color === "purple" && "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
                  detailedStatus.color === "violet" && "bg-gradient-to-r from-violet-500 to-violet-600 text-white",
                  detailedStatus.color === "amber" && "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                )}>
                  <StatusIcon className="h-3 w-3" />
                  {detailedStatus.label}
                </Badge>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50 rounded-xl p-3 mb-3 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm",
                      hasArrivedAtLoading ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                    )} />
                    <div className={cn(
                      "w-0.5 h-10 rounded-full",
                      isDelivered ? "bg-emerald-500" : 
                      hasDepartedLoading ? "bg-gradient-to-b from-emerald-500 to-blue-500" :
                      "bg-slate-300 dark:bg-slate-700"
                    )} />
                    <div className={cn(
                      "w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm",
                      isDelivered ? "bg-emerald-500" : 
                      hasArrivedAtOffloading ? "bg-purple-500" : 
                      "bg-slate-300 dark:bg-slate-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Origin</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {getLocationDisplayName(load.origin)}
                    </p>
                    {/* Show loading times */}
                    {hasArrivedAtLoading && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        Arrived: {formatTimestamp(load.actual_loading_arrival)}
                        {hasDepartedLoading && ` • Departed: ${formatTimestamp(load.actual_loading_departure)}`}
                      </p>
                    )}
                    {/* Late notes for loading */}
                    {(lateLoadingArrival || lateLoadingDeparture) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                          {lateLoadingArrival && `Arr: ${lateLoadingArrival}`}
                          {lateLoadingArrival && lateLoadingDeparture && " • "}
                          {lateLoadingDeparture && `Dep: ${lateLoadingDeparture}`}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium mt-3">Destination</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {getLocationDisplayName(load.destination)}
                    </p>
                    {/* Show offloading times */}
                    {hasArrivedAtOffloading && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        Arrived: {formatTimestamp(load.actual_offloading_arrival)}
                        {hasDepartedOffloading && ` • Departed: ${formatTimestamp(load.actual_offloading_departure)}`}
                      </p>
                    )}
                    {/* Late notes for offloading */}
                    {(lateOffloadingArrival || lateOffloadingDeparture) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                          {lateOffloadingArrival && `Arr: ${lateOffloadingArrival}`}
                          {lateOffloadingArrival && lateOffloadingDeparture && " • "}
                          {lateOffloadingDeparture && `Dep: ${lateOffloadingDeparture}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right pl-2">
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      {load.progressData ? Math.round(load.progressData.totalDistance) : "?"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">km</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mb-3 text-xs">
                {load.cargo_type && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/30">
                    <Box className="h-3 w-3 text-indigo-500" />
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">{formatCargoType(load.cargo_type)}</span>
                  </div>
                )}
                {load.weight > 0 && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20 px-2.5 py-1.5 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
                    <Weight className="h-3 w-3 text-orange-500" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">{load.weight}T</span>
                  </div>
                )}
              </div>

              {load.progressData && (
                <div className="mb-4">
                  {isDelivered ? (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Delivered
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">100%</span>
                      </div>
                      <Progress value={100} className="h-2.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-emerald-500 [&>div]:rounded-full" />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>{Math.round(load.progressData.totalDistance)} km total</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Complete</span>
                      </div>
                    </>
                  ) : isAtOffloadingPoint ? (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5" />
                          At Depot - Offloading
                        </span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">100%</span>
                      </div>
                      <Progress value={100} className="h-2.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-purple-400 [&>div]:to-purple-500 [&>div]:rounded-full" />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>Awaiting departure confirmation</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">📦 Offloading</span>
                      </div>
                    </>
                  ) : isTracking ? (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {Math.round(load.progressData.progress)}%
                        </span>
                      </div>
                      <Progress value={load.progressData.progress} className="h-2.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-500 [&>div]:rounded-full" />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>{Math.round(load.progressData.distanceTraveled)} km done</span>
                        <span>{Math.round(load.progressData.distanceRemaining)} km left</span>
                      </div>
                    </>
                  ) : isAtLoadingPoint ? (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1.5 font-medium">
                          <Package className="h-3.5 w-3.5" />
                          At Loading Point
                        </span>
                        <span className="text-slate-400">0%</span>
                      </div>
                      <Progress value={0} className="h-2.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-violet-400 [&>div]:to-violet-500 [&>div]:rounded-full" />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>Loading in progress</span>
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">📦 Loading</span>
                      </div>
                    </>
                  ) : load.isAtLoadOrigin ? (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5" />
                          At Depot - Loading
                        </span>
                        <span className="text-slate-400">0%</span>
                      </div>
                      <Progress value={0} className="h-2.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-purple-400 [&>div]:to-purple-500 [&>div]:rounded-full" />
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          Scheduled
                        </span>
                        <span className="text-slate-400">0%</span>
                      </div>
                      <Progress value={0} className="h-2.5 rounded-full" />
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                {isDelivered ? (
                  <>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Delivered</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {load.actual_offloading_departure 
                        ? formatTimestamp(load.actual_offloading_departure) 
                        : format(parseISO(load.loading_date), "dd MMM")}
                    </span>
                  </>
                ) : isTracking ? (
                  <>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Timer className="h-3.5 w-3.5" />
                      <span>ETA: {load.progressData?.etaFormatted || "N/A"}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">{load.progressData?.durationFormatted}</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">{format(parseISO(load.loading_date), "dd MMM")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold text-[10px] text-slate-600 dark:text-slate-400">{format(parseISO(load.loading_date), "HH:mm")}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="max-w-sm p-0 overflow-hidden shadow-xl border-slate-200/80 dark:border-slate-700/80">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Load {load.load_id}</span>
                <div className="mt-0.5"><StatusBadge 
                  status={load.status} 
                  distanceRemaining={load.progressData?.distanceRemaining}
                  hasArrivalTime={!!load.actual_offloading_arrival}
                  hasDepartureTime={!!load.actual_offloading_departure}
                /></div>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Origin</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{load.origin}</span>
              <span className="text-slate-500 dark:text-slate-400">Destination</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{load.destination}</span>
              {load.cargo_type && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Cargo</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{formatCargoType(load.cargo_type)}</span>
                </>
              )}
              {load.weight > 0 && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Weight</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{load.weight} tons</span>
                </>
              )}
              <span className="text-slate-500 dark:text-slate-400">Loading</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {format(parseISO(load.loading_date), "dd MMM HH:mm")}
              </span>
            </div>
            {isTracking && load.progressData && (
              <>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Progress</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(load.progressData.progress)}%
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {Math.round(load.progressData.distanceRemaining)} km
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">ETA</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {load.progressData.etaFormatted}
                  </span>
                </div>
              </>
            )}
            {!isTracking && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2 pt-3 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 bg-amber-50/50 dark:bg-amber-900/10 -mx-4 px-4 py-2 -mb-4">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>Tracking starts when truck arrives at {load.origin}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}