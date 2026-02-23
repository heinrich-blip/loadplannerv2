import { MainLayout } from "@/components/layout/MainLayout";
import { StatusBadge } from "@/components/loads/StatusBadge";
import * as timeWindowLib from "@/lib/timeWindow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import
  {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { useLoads } from "@/hooks/useLoads";
import type { Load } from "@/hooks/useLoads";
import
  {
    exportLoadsToExcel,
    exportLoadsToExcelSimplified,
  } from "@/lib/exportLoadsToExcel";
import { cn, getLocationDisplayName } from "@/lib/utils";
import
  {
    addDays,
    differenceInDays,
    format,
    getWeek,
    getYear,
    isSameDay,
    isWithinInterval,
    parseISO,
    setWeek,
    startOfWeek,
  } from "date-fns";
import
  {
    ArrowRight,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Package,
    RotateCcw,
    TrendingUp,
    Truck,
  } from "lucide-react";
import { useMemo, useState } from "react";

// Display labels for cargo types
const cargoLabels: Record<string, string> = {
  VanSalesRetail: "Van Sales/Retail",
  Retail: "Retail",
  Vendor: "Vendor",
  RetailVendor: "Retail Vendor",
  Fertilizer: "Fertilizer",
  BV: "BV (Backload)",
  CBC: "CBC (Backload)",
  Packaging: "Packaging (Backload)",
};

// Check if a load is a backload (legacy - for old cargo_type based backloads)
function isLegacyBackload(load: Load): boolean {
  return (
    load.cargo_type === "Packaging" ||
    (load.cargo_type === "Fertilizer" && load.load_id.startsWith("BL-")) ||
    load.load_id.startsWith("BL-")
  );
}

// Parse time_window JSON to get times and backload info
function parseTimeWindowData(timeWindow: unknown) {
  const tw = timeWindowLib.parseTimeWindow(timeWindow);
  return {
    originDeparture: tw.origin.plannedDeparture || "",
    destArrival: tw.destination.plannedArrival || "",
    backload: tw.backload,
  };
}

// Check if a load has a backload (new embedded backload)
function hasBackload(load: Load): boolean {
  const times = parseTimeWindowData(load.time_window);
  return times.backload?.enabled === true;
}

// Get the position of a date within the week (0-6)
function getDayPosition(date: Date, weekStart: Date): number {
  return differenceInDays(date, weekStart);
}

// Check if a load is visible in the current week
function isLoadInWeek(load: Load, weekStart: Date, weekEnd: Date): boolean {
  try {
    const loadingDate = parseISO(load.loading_date);
    const offloadingDate = parseISO(load.offloading_date);

    // Load is in week if any part of it overlaps with the week
    return (
      isWithinInterval(loadingDate, { start: weekStart, end: weekEnd }) ||
      isWithinInterval(offloadingDate, { start: weekStart, end: weekEnd }) ||
      (loadingDate <= weekStart && offloadingDate >= weekEnd)
    );
  } catch {
    return false;
  }
}

// Generate all weeks for a year
function generateWeeksForYear(
  year: number,
): { week: number; start: Date; end: Date }[] {
  const weeks: { week: number; start: Date; end: Date }[] = [];

  for (let i = 1; i <= 52; i++) {
    const weekDate = setWeek(new Date(year, 0, 4), i, { weekStartsOn: 1 });
    const actualWeekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = addDays(actualWeekStart, 6);
    weeks.push({ week: i, start: actualWeekStart, end: weekEnd });
  }

  return weeks;
}

export default function CalendarPage() {
  const { data: loads = [], isLoading } = useLoads();
  const { data: fleetVehicles = [] } = useFleetVehicles();

  const today = new Date();
  const currentYear = getYear(today);
  const currentWeekNum = getWeek(today, { weekStartsOn: 1 });

  // State for selected week and year
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekNum);

  // Calculate week start and end for selected week
  const { weekStart, weekEnd } = useMemo(() => {
    const weekDate = setWeek(new Date(selectedYear, 0, 4), selectedWeek, {
      weekStartsOn: 1,
    });
    const start = startOfWeek(weekDate, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return { weekStart: start, weekEnd: end };
  }, [selectedYear, selectedWeek]);

  // Generate week options for dropdown
  const weekOptions = useMemo(
    () => generateWeeksForYear(selectedYear),
    [selectedYear],
  );

  // Available years (current year -1 to +1)
  const yearOptions = useMemo(() => {
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [currentYear]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Get loads that are visible in this week
  const weekLoads = useMemo(() => {
    return loads.filter((load) => isLoadInWeek(load, weekStart, weekEnd));
  }, [loads, weekStart, weekEnd]);

  // Group loads by truck (vehicle_id), sorted alphabetically, with lane assignments for overlapping loads
  const loadsByTruck = useMemo(() => {
    const grouped: Record<string, Load[]> = {};

    weekLoads.forEach((load) => {
      const truckId = load.fleet_vehicle?.vehicle_id || "Unassigned";
      if (!grouped[truckId]) {
        grouped[truckId] = [];
      }
      grouped[truckId].push(load);
    });

    // Sort loads within each truck by loading date
    Object.keys(grouped).forEach((truckId) => {
      grouped[truckId].sort(
        (a, b) =>
          parseISO(a.loading_date).getTime() -
          parseISO(b.loading_date).getTime(),
      );
    });

    // Sort truck IDs alphabetically, but put "Unassigned" at the end
    const sortedTruckIds = Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    // Assign lanes to overlapping loads for each truck
    const loadLanes: Record<string, number> = {};
    const maxLanes: Record<string, number> = {};

    sortedTruckIds.forEach((truckId) => {
      const truckLoads = grouped[truckId];
      const lanes: { endDate: Date; lane: number }[] = [];
      let maxLane = 0;

      truckLoads.forEach((load) => {
        const loadStart = parseISO(load.loading_date);
        const loadEnd = parseISO(load.offloading_date);

        // Find an available lane (one where the previous load has ended)
        let assignedLane = 0;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i].endDate < loadStart) {
            assignedLane = lanes[i].lane;
            lanes[i].endDate = loadEnd;
            break;
          }
          assignedLane = i + 1;
        }

        if (assignedLane >= lanes.length) {
          lanes.push({ endDate: loadEnd, lane: assignedLane });
        }

        loadLanes[load.id] = assignedLane;
        maxLane = Math.max(maxLane, assignedLane);
      });

      maxLanes[truckId] = maxLane;
    });

    return { grouped, sortedTruckIds, loadLanes, maxLanes };
  }, [weekLoads]);

  // Map of truck availability from fleet vehicles
  const truckAvailability = useMemo(() => {
    const availability: Record<string, boolean> = {};
    fleetVehicles.forEach((vehicle) => {
      availability[vehicle.vehicle_id] = vehicle.available;
    });
    return availability;
  }, [fleetVehicles]);

  // Check if a truck has any load covering a specific day
  const isTruckBusyOnDay = (
    truckId: string,
    day: Date,
    truckLoads: Load[],
  ): boolean => {
    return truckLoads.some((load) => {
      try {
        const loadingDate = parseISO(load.loading_date);
        const offloadingDate = parseISO(load.offloading_date);
        return day >= loadingDate && day <= offloadingDate;
      } catch {
        return false;
      }
    });
  };

  // Calculate load bar positioning
  const getLoadBarStyle = (load: Load) => {
    const loadingDate = parseISO(load.loading_date);
    const offloadingDate = parseISO(load.offloading_date);

    // Clamp dates to week boundaries
    const startPos = Math.max(0, getDayPosition(loadingDate, weekStart));
    const endPos = Math.min(6, getDayPosition(offloadingDate, weekStart));

    // Calculate span (number of days)
    const span = endPos - startPos + 1;

    return {
      gridColumnStart: startPos + 1,
      gridColumnEnd: `span ${span}`,
      startsBeforeWeek: loadingDate < weekStart,
      endsAfterWeek: offloadingDate > weekEnd,
    };
  };

  // Navigation handlers
  const goToPreviousWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    } else {
      setSelectedYear(selectedYear - 1);
      setSelectedWeek(52);
    }
  };

  const goToNextWeek = () => {
    if (selectedWeek < 52) {
      setSelectedWeek(selectedWeek + 1);
    } else {
      setSelectedYear(selectedYear + 1);
      setSelectedWeek(1);
    }
  };

  const goToCurrentWeek = () => {
    setSelectedYear(currentYear);
    setSelectedWeek(currentWeekNum);
  };

  const handleExportWeek = (simplified = false) => {
    if (simplified) {
      exportLoadsToExcelSimplified(weekLoads, {
        filename: `loads-simplified-week-${selectedWeek}-${selectedYear}`,
        sheetName: `Week ${selectedWeek}`,
      });
    } else {
      exportLoadsToExcel(weekLoads, {
        filename: `loads-week-${selectedWeek}-${selectedYear}`,
        sheetName: `Week ${selectedWeek}`,
      });
    }
  };

  const isCurrentWeek =
    selectedYear === currentYear && selectedWeek === currentWeekNum;

  if (isLoading) {
    return (
      <MainLayout title="Calendar">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Calendar">
      <TooltipProvider>
        <div className="space-y-6 animate-fade-in">
          {/* Modern Header with Glassmorphism */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/10 p-6">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      Weekly Planner
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        Week {selectedWeek}
                      </span>
                      <span>
                        {format(weekStart, "d MMM")} -{" "}
                        {format(weekEnd, "d MMM yyyy")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-background/80 backdrop-blur-sm rounded-xl border shadow-sm p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousWeek}
                        className="h-9 w-9 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous Week</TooltipContent>
                  </Tooltip>

                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                  >
                    <SelectTrigger className="w-[90px] border-0 bg-transparent shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedWeek.toString()}
                    onValueChange={(val) => setSelectedWeek(parseInt(val))}
                  >
                    <SelectTrigger className="w-[150px] border-0 bg-transparent shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {weekOptions.map(({ week, start }) => (
                        <SelectItem key={week} value={week.toString()}>
                          Week {week} ({format(start, "d MMM")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextWeek}
                        className="h-9 w-9 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next Week</TooltipContent>
                  </Tooltip>
                </div>

                {!isCurrentWeek && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="gap-2 rounded-xl shadow-sm"
                  >
                    <Clock className="h-4 w-4" />
                    Today
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={weekLoads.length === 0}
                      className="gap-2 rounded-xl shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportWeek(false)}>
                      Full Export (All Columns)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportWeek(true)}>
                      Simplified Export
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Stats Cards with Modern Design */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Loads
                    </p>
                    <p className="text-3xl font-bold tracking-tight mt-1">
                      {weekLoads.length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-slate-200/50 dark:bg-slate-700/50 flex items-center justify-center">
                    <Package className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  This week
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Scheduled
                    </p>
                    <p className="text-3xl font-bold tracking-tight mt-1 text-purple-700 dark:text-purple-300">
                      {weekLoads.filter((l) => l.status === "scheduled").length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-purple-200/50 dark:bg-purple-800/50 flex items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${weekLoads.length ? (weekLoads.filter((l) => l.status === "scheduled").length / weekLoads.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      In Transit
                    </p>
                    <p className="text-3xl font-bold tracking-tight mt-1 text-blue-700 dark:text-blue-300">
                      {
                        weekLoads.filter((l) => l.status === "in-transit")
                          .length
                      }
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-200/50 dark:bg-blue-800/50 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${weekLoads.length ? (weekLoads.filter((l) => l.status === "in-transit").length / weekLoads.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Delivered
                    </p>
                    <p className="text-3xl font-bold tracking-tight mt-1 text-emerald-700 dark:text-emerald-300">
                      {weekLoads.filter((l) => l.status === "delivered").length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-200/50 dark:bg-emerald-800/50 flex items-center justify-center">
                    <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${weekLoads.length ? (weekLoads.filter((l) => l.status === "delivered").length / weekLoads.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Grid with Truck Lanes */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Days Header with Truck Column */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] bg-gradient-to-r from-muted/80 to-muted/40 border-b">
              {/* Truck Column Header */}
              <div className="p-4 flex items-center justify-center border-r border-border/50 bg-muted/60">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Truck
                  </span>
                </div>
              </div>
              {weekDays.map((day, index) => {
                const isDayToday = isSameDay(day, today);
                const isWeekend = index >= 5;
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-4 text-center border-r border-border/50 last:border-r-0 transition-colors",
                      isDayToday && "bg-primary/5",
                      isWeekend && "bg-muted/50",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        isDayToday ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {format(day, "EEE")}
                    </p>
                    <div
                      className={cn(
                        "mt-2 mx-auto flex items-center justify-center",
                        isDayToday && "relative",
                      )}
                    >
                      {isDayToday && (
                        <div className="absolute inset-0 bg-primary rounded-full scale-150 opacity-10" />
                      )}
                      <span
                        className={cn(
                          "text-2xl font-bold relative z-10",
                          isDayToday ? "text-primary" : "text-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-[10px] mt-1 uppercase tracking-wider",
                        isDayToday
                          ? "text-primary/70"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {format(day, "MMM")}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Truck Lanes */}
            <div className="relative bg-gradient-to-b from-background to-muted/10">
              {weekLoads.length === 0 ? (
                <div className="flex items-center justify-center h-[350px]">
                  <div className="text-center space-y-4">
                    <div className="mx-auto h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Truck className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        No loads scheduled
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Week {selectedWeek} • {format(weekStart, "d MMM")} -{" "}
                        {format(weekEnd, "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {loadsByTruck.sortedTruckIds.map((truckId, truckIndex) => {
                    const truckLoads = loadsByTruck.grouped[truckId];
                    const isUnassigned = truckId === "Unassigned";

                    return (
                      <div
                        key={truckId}
                        className={cn(
                          "grid grid-cols-[140px_repeat(7,1fr)] min-h-[100px]",
                          truckIndex % 2 === 0
                            ? "bg-background"
                            : "bg-muted/10",
                          "animate-fade-in",
                        )}
                        style={{ animationDelay: `${truckIndex * 50}ms` }}
                      >
                        {/* Truck ID Column */}
                        <div
                          className={cn(
                            "p-3 border-r border-border/50 flex flex-col justify-center items-center gap-1 sticky left-0 z-10",
                            isUnassigned
                              ? "bg-amber-50/80 dark:bg-amber-950/30"
                              : truckIndex % 2 === 0
                                ? "bg-background"
                                : "bg-muted/10",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl",
                              isUnassigned
                                ? "bg-amber-100 dark:bg-amber-900/50"
                                : "bg-slate-100 dark:bg-slate-800",
                            )}
                          >
                            <Truck
                              className={cn(
                                "h-5 w-5",
                                isUnassigned
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-600 dark:text-slate-400",
                              )}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-bold text-sm text-center",
                              isUnassigned
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-foreground",
                            )}
                          >
                            {truckId}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {truckLoads.length} load
                            {truckLoads.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Day Grid with Loads */}
                        <div className="col-span-7 relative">
                          {/* Day Column Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                            {weekDays.map((day, index) => {
                              const isDayToday = isSameDay(day, today);
                              const isWeekend = index >= 5;
                              const isTruckAvailable = isUnassigned
                                ? true
                                : truckAvailability[truckId] !== false;
                              const hasBusyLoad = isTruckBusyOnDay(
                                truckId,
                                day,
                                truckLoads,
                              );
                              const isIdleDay =
                                !isUnassigned &&
                                (!isTruckAvailable || !hasBusyLoad);

                              return (
                                <div
                                  key={index}
                                  className={cn(
                                    "border-r border-border/20 last:border-r-0",
                                    isDayToday && "bg-primary/[0.03]",
                                    isWeekend && !isIdleDay && "bg-muted/30",
                                    isIdleDay && "bg-red-50 dark:bg-red-950/20",
                                  )}
                                />
                              );
                            })}
                          </div>

                          {/* Loads for this truck - Gantt-style timeline */}
                          <div 
                            className="relative grid grid-cols-7"
                            style={{ 
                              minHeight: `${Math.max(80, ((loadsByTruck.maxLanes[truckId] ?? 0) + 1) * 80)}px`,
                              gridTemplateRows: `repeat(${(loadsByTruck.maxLanes[truckId] ?? 0) + 1}, 1fr)`,
                            }}
                          >
                            {truckLoads.map((load) => {
                              const barStyle = getLoadBarStyle(load);
                              const times = parseTimeWindowData(
                                load.time_window,
                              );
                              const isLegacyBackloadLoad =
                                isLegacyBackload(load);
                              const loadHasBackload = hasBackload(load);

                              return (
                                <Tooltip key={load.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "relative group p-2 m-1 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer z-10",
                                        "animate-fade-in",
                                        isLegacyBackloadLoad
                                          ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300 dark:from-orange-950/40 dark:to-amber-950/40 dark:border-orange-800"
                                          : load.status === "delivered"
                                            ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 hover:border-emerald-300 dark:from-emerald-950/40 dark:to-green-950/40 dark:border-emerald-800"
                                            : load.status === "in-transit"
                                              ? "bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 hover:border-blue-300 dark:from-blue-950/40 dark:to-sky-950/40 dark:border-blue-800"
                                              : load.status === "scheduled"
                                                ? "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 hover:border-purple-300 dark:from-purple-950/40 dark:to-violet-950/40 dark:border-purple-800"
                                                : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300 dark:from-amber-950/40 dark:to-yellow-950/40 dark:border-amber-800",
                                        barStyle.startsBeforeWeek &&
                                          "rounded-l-none border-l-0 ml-0",
                                        barStyle.endsAfterWeek &&
                                          "rounded-r-none border-r-0 mr-0",
                                      )}
                                      style={{
                                        gridColumnStart:
                                          barStyle.gridColumnStart,
                                        gridColumnEnd: barStyle.gridColumnEnd,
                                        gridRow: (loadsByTruck.loadLanes[load.id] ?? 0) + 1,
                                      }}
                                    >
                                      {/* Continuation Indicators */}
                                      {barStyle.startsBeforeWeek && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
                                          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}
                                      {barStyle.endsAfterWeek && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
                                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}

                                      {/* Backload Badge - for loads with embedded backload */}
                                      {loadHasBackload && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-1 shadow-lg ring-2 ring-background">
                                          <RotateCcw className="h-2.5 w-2.5" />
                                        </div>
                                      )}
                                      {/* Legacy Backload Badge */}
                                      {isLegacyBackloadLoad &&
                                        !loadHasBackload && (
                                          <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-1 shadow-lg ring-2 ring-background">
                                            <RotateCcw className="h-2.5 w-2.5" />
                                          </div>
                                        )}

                                      {/* Compact Load Info */}
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="font-bold text-foreground text-xs truncate">
                                          {load.load_id}
                                        </span>
                                        <StatusBadge
                                          status={load.status}
                                          size="sm"
                                        />
                                      </div>

                                      {/* Journey */}
                                      <div className="flex items-center gap-1 text-[10px] mt-1">
                                        <span className="font-medium text-green-700 dark:text-green-400 truncate">
                                          {getLocationDisplayName(
                                            load.origin,
                                          )}
                                        </span>
                                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-blue-700 dark:text-blue-400 truncate">
                                          {getLocationDisplayName(
                                            load.destination,
                                          )}
                                        </span>
                                        {loadHasBackload &&
                                          times.backload && (
                                            <>
                                              <ArrowRight className="h-2.5 w-2.5 text-orange-500 flex-shrink-0" />
                                              <span className="font-medium text-orange-600 dark:text-orange-400 truncate">
                                                {getLocationDisplayName(
                                                  times.backload.destination,
                                                )}
                                              </span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs"
                                  >
                                    <div className="space-y-2">
                                      <div className="font-semibold">
                                        {load.load_id}
                                      </div>
                                      <div className="text-sm space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-green-600">
                                            From:
                                          </span>
                                          <span>
                                            {getLocationDisplayName(
                                              load.origin,
                                            )}
                                          </span>
                                          {times.originDeparture && (
                                            <span className="text-muted-foreground">
                                              ({times.originDeparture})
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-blue-600">
                                            To:
                                          </span>
                                          <span>
                                            {getLocationDisplayName(
                                              load.destination,
                                            )}
                                          </span>
                                          {times.destArrival && (
                                            <span className="text-muted-foreground">
                                              ({times.destArrival})
                                            </span>
                                          )}
                                        </div>
                                        <div>
                                          Cargo:{" "}
                                          {cargoLabels[load.cargo_type] ||
                                            load.cargo_type}
                                        </div>
                                        <div>
                                          Driver:{" "}
                                          {load.driver?.name || "Unassigned"}
                                        </div>
                                        <div>
                                          {format(
                                            parseISO(load.loading_date),
                                            "d MMM",
                                          )}{" "}
                                          -{" "}
                                          {format(
                                            parseISO(load.offloading_date),
                                            "d MMM",
                                          )}
                                        </div>
                                        {loadHasBackload &&
                                          times.backload && (
                                            <div className="pt-2 mt-2 border-t border-orange-200 dark:border-orange-800">
                                              <div className="text-orange-600 font-medium mb-1">
                                                ↩ Backload:
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-orange-500">
                                                  To:
                                                </span>
                                                <span>
                                                  {getLocationDisplayName(
                                                    times.backload
                                                      .destination,
                                                  )}
                                                </span>
                                              </div>
                                              <div>
                                                Cargo:{" "}
                                                {times.backload.cargoType}
                                              </div>
                                              <div>
                                                Date:{" "}
                                                {format(
                                                  parseISO(
                                                    times.backload
                                                      .offloadingDate,
                                                  ),
                                                  "d MMM yyyy",
                                                )}
                                              </div>
                                              {times.backload.notes && (
                                                <div className="text-muted-foreground text-xs mt-1">
                                                  {times.backload.notes}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              Week {selectedWeek} of 52 • {selectedYear}
              {isCurrentWeek && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  Current Week
                </span>
              )}
            </span>
          </div>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}