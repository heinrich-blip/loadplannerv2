import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import * as timeWindowLib from "@/lib/timeWindow";
import { timeToSASTMinutes } from "@/lib/timeWindow";
import
  {
    Card,
    CardContent,
  } from "@/components/ui/card";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseBackloadInfo, useLoads } from "@/hooks/useLoads";
import { safeFormatDate } from "@/lib/utils";
import { exportReportsToPdf, exportVarianceToPdf } from "@/lib/exportReportsToPdf";
import { exportVarianceToExcel } from "@/lib/exportVarianceToExcel";
import { DistributionTab } from "@/components/reports/DistributionTab";
import { TimeAnalysisTab } from "@/components/reports/TimeAnalysisTab";
import { BackloadAnalyticsTab } from "@/components/reports/BackloadAnalyticsTab";
import { ClientFeedbackTab } from "@/components/reports/ClientFeedbackTab";
import type {
  CargoDistribution,
  StatusDistribution,
  RouteData,
  WeeklyTrend,
  DayOfWeekData,
  MonthlyTrend,
  TimeVarianceData,
  LocationVariance,
  BackloadDistribution,
  BackloadDestinationData,
  BackloadWeeklyTrend,
  BackloadMovement,
  BackloadCargoTypeData,
  DailyPunctualityRow,
  WeeklyPunctualityRow,
  DelayBarRow,
} from "@/components/reports/types";

interface TimeWindowData {
  timeWindow: string;
  count: number;
}
import
  {
    eachWeekOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    getDay,
    parseISO,
    startOfMonth,
    subMonths,
  } from "date-fns";
import
  {
    Clock,
    Download,
    FileText,
    Map as MapIcon,
    MessageSquare,
    Package,
    PieChart as PieChartIcon,
    TrendingUp,
  } from "lucide-react";
import { useMemo, useState } from "react";

const CARGO_COLORS: Record<string, string> = {
  VanSalesRetail: "#6366f1",
  Retail: "#8b5cf6",
  Vendor: "#a855f7",
  RetailVendor: "#d946ef",
  Fertilizer: "#22c55e",
  Export: "#ec4899",
  BV: "#f97316",
  CBC: "#eab308",
  Packaging: "#06b6d4",
};

const BACKLOAD_DESTINATION_COLORS: Record<string, string> = {
  BV: "#f97316",
  CBC: "#eab308",
  Packaging: "#06b6d4",
  Fertilizer: "#22c55e",
  Other: "#64748b",
};

const PACKAGING_TYPE_COLORS: Record<string, string> = {
  Bins: "#8b5cf6",
  Crates: "#06b6d4",
  Pallets: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  "in-transit": "#f59e0b",
  delivered: "#22c55e",
  pending: "#ef4444",
};

// Calculate time variance in minutes between planned and actual
// Uses shared SAST-aware conversion so ISO timestamps are correctly
// compared against planned HH:mm times (which are always in SAST).
const calculateVarianceMinutes = (
  planned: string | undefined,
  actual: string | undefined,
): number | null => {
  const pMin = timeToSASTMinutes(planned);
  const aMin = timeToSASTMinutes(actual);
  if (pMin === null || aMin === null) return null;
  return aMin - pMin;
};

const _CHART_GRADIENT_COLORS = {
  primary: ["#6366f1", "#8b5cf6"],
  success: ["#22c55e", "#10b981"],
  warning: ["#f59e0b", "#f97316"],
  info: ["#06b6d4", "#0ea5e9"],
};

// Helper function to categorize time windows into readable labels
const categorizeTimeWindow = (timeWindow: unknown): string => {
  const tw = typeof timeWindow === 'string' ? timeWindow : '';
  if (!tw || tw === "Unspecified") return "Unspecified";

  // Try to extract start hour from formats like "06:00 AM - 02:00 PM" or "06:00-14:00"
  const match = tw.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
  if (!match) return tw;

  let hour = parseInt(match[1], 10);
  const period = match[2]?.toUpperCase();

  // Convert to 24-hour format if AM/PM is present
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  // Categorize by start time
  if (hour >= 5 && hour < 8) return "Early Morning";
  if (hour >= 8 && hour < 11) return "Mid Morning";
  if (hour >= 11 && hour < 14) return "Midday";
  if (hour >= 14 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 20) return "Evening";
  return "Other";
};

export default function ReportsPage() {
  const { data: loads = [], isLoading } = useLoads();
  const [timeRange, setTimeRange] = useState<
    "3months" | "6months" | "12months"
  >("3months");
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");

  const filteredLoads = useMemo(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);

    return loads.filter((load) => {
      const loadDate = parseISO(load.loading_date);
      return loadDate >= startDate && loadDate <= now;
    });
  }, [loads, timeRange]);

  // Cargo type distribution
  const cargoDistribution = useMemo<CargoDistribution[]>(() => {
    const distribution: Record<string, number> = {};
    filteredLoads.forEach((load) => {
      distribution[load.cargo_type] = (distribution[load.cargo_type] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
        fill: CARGO_COLORS[name] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLoads]);

  // Daily punctuality (planned vs actual at origin/destination)
  const _dailyPunctuality = useMemo<DailyPunctualityRow[]>(() => {
    const map = new Map<string, {
      loads: number;
      sums: { oa: number; oaN: number; od: number; odN: number; da: number; daN: number; dd: number; ddN: number };
      originDelayCount: number;
      destDelayCount: number;
    }>();

    for (const load of filteredLoads) {
      const key = safeFormatDate(load.loading_date, 'yyyy-MM-dd', 'unknown');
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      if (!times) continue;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);

      if (!map.has(key)) {
        map.set(key, { loads: 0, sums: { oa: 0, oaN: 0, od: 0, odN: 0, da: 0, daN: 0, dd: 0, ddN: 0 }, originDelayCount: 0, destDelayCount: 0 });
      }
      const agg = map.get(key)!;
      agg.loads += 1;
      if (oa !== null) { agg.sums.oa += oa; agg.sums.oaN += 1; if (oa > 15) agg.originDelayCount += 1; }
      if (od !== null) { agg.sums.od += od; agg.sums.odN += 1; if (od > 15) agg.originDelayCount += 1; }
      if (da !== null) { agg.sums.da += da; agg.sums.daN += 1; if (da > 15) agg.destDelayCount += 1; }
      if (dd !== null) { agg.sums.dd += dd; agg.sums.ddN += 1; if (dd > 15) agg.destDelayCount += 1; }
    }

    const rows: DailyPunctualityRow[] = [];
    Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, agg]) => {
      rows.push({
        date,
        loads: agg.loads,
        originArrivalAvg: agg.sums.oaN ? Math.round(agg.sums.oa / agg.sums.oaN) : null,
        originDepartureAvg: agg.sums.odN ? Math.round(agg.sums.od / agg.sums.odN) : null,
        destArrivalAvg: agg.sums.daN ? Math.round(agg.sums.da / agg.sums.daN) : null,
        destDepartureAvg: agg.sums.ddN ? Math.round(agg.sums.dd / agg.sums.ddN) : null,
        originDelayCount: agg.originDelayCount,
        destDelayCount: agg.destDelayCount,
      });
    });
    return rows;
  }, [filteredLoads]);

  // Weekly punctuality (grouped by week start - Monday)
  const _weeklyPunctuality = useMemo<WeeklyPunctualityRow[]>(() => {
    const now = new Date();
    const monthsToSubtract = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
    const byWeekStartISO = new Map<string, {
      label: string; loads: number; sums: { oa: number; oaN: number; od: number; odN: number; da: number; daN: number; dd: number; ddN: number }; originDelayCount: number; destDelayCount: number;
    }>();

    for (const weekStart of weeks) {
      const key = format(weekStart, 'yyyy-MM-dd');
      byWeekStartISO.set(key, { label: format(weekStart, 'MMM d'), loads: 0, sums: { oa: 0, oaN: 0, od: 0, odN: 0, da: 0, daN: 0, dd: 0, ddN: 0 }, originDelayCount: 0, destDelayCount: 0 });
    }

    for (const load of filteredLoads) {
      const loadDate = parseISO(load.loading_date);
      // Find weekStart Monday
      const weekStart = eachWeekOfInterval({ start: loadDate, end: loadDate }, { weekStartsOn: 1 })[0];
      const key = format(weekStart, 'yyyy-MM-dd');
      if (!byWeekStartISO.has(key)) continue;
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      if (!times) continue;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);
      const agg = byWeekStartISO.get(key)!;
      agg.loads += 1;
      if (oa !== null) { agg.sums.oa += oa; agg.sums.oaN += 1; if (oa > 15) agg.originDelayCount += 1; }
      if (od !== null) { agg.sums.od += od; agg.sums.odN += 1; if (od > 15) agg.originDelayCount += 1; }
      if (da !== null) { agg.sums.da += da; agg.sums.daN += 1; if (da > 15) agg.destDelayCount += 1; }
      if (dd !== null) { agg.sums.dd += dd; agg.sums.ddN += 1; if (dd > 15) agg.destDelayCount += 1; }
    }

    return Array.from(byWeekStartISO.entries()).map(([_, v]) => ({
      week: v.label,
      loads: v.loads,
      originArrivalAvg: v.sums.oaN ? Math.round(v.sums.oa / v.sums.oaN) : null,
      originDepartureAvg: v.sums.odN ? Math.round(v.sums.od / v.sums.odN) : null,
      destArrivalAvg: v.sums.daN ? Math.round(v.sums.da / v.sums.daN) : null,
      destDepartureAvg: v.sums.ddN ? Math.round(v.sums.dd / v.sums.ddN) : null,
      originDelayCount: v.originDelayCount,
      destDelayCount: v.destDelayCount,
    }));
  }, [filteredLoads, timeRange]);

  // Monthly punctuality (grouped by calendar month)
  const monthlyPunctuality = useMemo<WeeklyPunctualityRow[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const byMonth = new Map<
      string,
      {
        label: string;
        loads: number;
        sums: {
          oa: number;
          oaN: number;
          od: number;
          odN: number;
          da: number;
          daN: number;
          dd: number;
          ddN: number;
        };
        originDelayCount: number;
        destDelayCount: number;
      }
    >();

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, "yyyy-MM");
      byMonth.set(key, {
        label: format(monthDate, "MMM yy"),
        loads: 0,
        sums: { oa: 0, oaN: 0, od: 0, odN: 0, da: 0, daN: 0, dd: 0, ddN: 0 },
        originDelayCount: 0,
        destDelayCount: 0,
      });
    }

    for (const load of filteredLoads) {
      const loadDate = parseISO(load.loading_date);
      const key = format(loadDate, "yyyy-MM");
      if (!byMonth.has(key)) continue;
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      if (!times) continue;

      const oa = calculateVarianceMinutes(
        times.origin.plannedArrival,
        times.origin.actualArrival,
      );
      const od = calculateVarianceMinutes(
        times.origin.plannedDeparture,
        times.origin.actualDeparture,
      );
      const da = calculateVarianceMinutes(
        times.destination.plannedArrival,
        times.destination.actualArrival,
      );
      const dd = calculateVarianceMinutes(
        times.destination.plannedDeparture,
        times.destination.actualDeparture,
      );

      const agg = byMonth.get(key)!;
      agg.loads += 1;
      if (oa !== null) {
        agg.sums.oa += oa;
        agg.sums.oaN += 1;
        if (oa > 15) agg.originDelayCount += 1;
      }
      if (od !== null) {
        agg.sums.od += od;
        agg.sums.odN += 1;
        if (od > 15) agg.originDelayCount += 1;
      }
      if (da !== null) {
        agg.sums.da += da;
        agg.sums.daN += 1;
        if (da > 15) agg.destDelayCount += 1;
      }
      if (dd !== null) {
        agg.sums.dd += dd;
        agg.sums.ddN += 1;
        if (dd > 15) agg.destDelayCount += 1;
      }
    }

    return Array.from(byMonth.values()).map((v) => ({
      week: v.label,
      loads: v.loads,
      originArrivalAvg: v.sums.oaN ? Math.round(v.sums.oa / v.sums.oaN) : null,
      originDepartureAvg: v.sums.odN ? Math.round(v.sums.od / v.sums.odN) : null,
      destArrivalAvg: v.sums.daN ? Math.round(v.sums.da / v.sums.daN) : null,
      destDepartureAvg: v.sums.ddN ? Math.round(v.sums.dd / v.sums.ddN) : null,
      originDelayCount: v.originDelayCount,
      destDelayCount: v.destDelayCount,
    }));
  }, [filteredLoads, timeRange]);

  // Delay summary across filtered range (where delays occurred)
  const _delaySummary = useMemo(() => {
    const originDelaysByLocation: Record<string, number> = {};
    const destDelaysByLocation: Record<string, number> = {};
    for (const load of filteredLoads) {
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      if (!times) continue;
      const originName = load.origin;
      const destName = load.destination;
      const oa = calculateVarianceMinutes(times.origin.plannedArrival, times.origin.actualArrival);
      const od = calculateVarianceMinutes(times.origin.plannedDeparture, times.origin.actualDeparture);
      const da = calculateVarianceMinutes(times.destination.plannedArrival, times.destination.actualArrival);
      const dd = calculateVarianceMinutes(times.destination.plannedDeparture, times.destination.actualDeparture);
      const add = (map: Record<string, number>, key: string, val: number | null) => { if (val !== null && val > 15) map[key] = (map[key] || 0) + val; };
      add(originDelaysByLocation, originName, oa);
      add(originDelaysByLocation, originName, od);
      add(destDelaysByLocation, destName, da);
      add(destDelaysByLocation, destName, dd);
    }
    const topOrigins = Object.entries(originDelaysByLocation).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topDests = Object.entries(destDelaysByLocation).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return { topOrigins, topDests };
  }, [filteredLoads]);

  // Compact charts: delays by location (counts of late arrivals/departures)
  const originDelayChartData = useMemo<DelayBarRow[]>(() => {
    const byLoc: Record<string, { arr: number; dep: number }> = {};
    for (const load of filteredLoads) {
      const t = timeWindowLib.parseTimeWindow(load.time_window);
      if (!t) continue;
      const k = load.origin;
      if (!byLoc[k]) byLoc[k] = { arr: 0, dep: 0 };
      const oa = calculateVarianceMinutes(t.origin.plannedArrival, t.origin.actualArrival);
      const od = calculateVarianceMinutes(t.origin.plannedDeparture, t.origin.actualDeparture);
      if (oa !== null && oa > 15) byLoc[k].arr += 1;
      if (od !== null && od > 15) byLoc[k].dep += 1;
    }
    return Object.entries(byLoc)
      .map(([location, v]) => ({ location, arrLate: v.arr, depLate: v.dep, totalLate: v.arr + v.dep }))
      .sort((a, b) => b.totalLate - a.totalLate)
      .slice(0, 10);
  }, [filteredLoads]);

  const destinationDelayChartData = useMemo<DelayBarRow[]>(() => {
    const byLoc: Record<string, { arr: number; dep: number }> = {};
    for (const load of filteredLoads) {
      const t = timeWindowLib.parseTimeWindow(load.time_window);
      if (!t) continue;
      const k = load.destination;
      if (!byLoc[k]) byLoc[k] = { arr: 0, dep: 0 };
      const da = calculateVarianceMinutes(t.destination.plannedArrival, t.destination.actualArrival);
      const dd = calculateVarianceMinutes(t.destination.plannedDeparture, t.destination.actualDeparture);
      if (da !== null && da > 15) byLoc[k].arr += 1;
      if (dd !== null && dd > 15) byLoc[k].dep += 1;
    }
    return Object.entries(byLoc)
      .map(([location, v]) => ({ location, arrLate: v.arr, depLate: v.dep, totalLate: v.arr + v.dep }))
      .sort((a, b) => b.totalLate - a.totalLate)
      .slice(0, 10);
  }, [filteredLoads]);

  // Status distribution
  const statusDistribution = useMemo<StatusDistribution[]>(() => {
    const distribution: Record<string, number> = {};
    filteredLoads.forEach((load) => {
      distribution[load.status] = (distribution[load.status] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({
      name:
        name === "in-transit"
          ? "In Transit"
          : name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: STATUS_COLORS[name] || "#64748b",
    }));
  }, [filteredLoads]);

  // Top routes by load count
  const topRoutes = useMemo<RouteData[]>(() => {
    const routes: Record<string, { loads: number }> = {};
    filteredLoads.forEach((load) => {
      const route = `${load.origin} → ${load.destination}`;
      if (!routes[route]) {
        routes[route] = { loads: 0 };
      }
      routes[route].loads += 1;
    });
    return Object.entries(routes)
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.loads - a.loads)
      .slice(0, 8);
  }, [filteredLoads]);

  // Weekly trend data
  const weeklyTrend = useMemo<WeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 1 },
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLoads = filteredLoads.filter((load) => {
        const loadDate = parseISO(load.loading_date);
        return loadDate >= weekStart && loadDate <= weekEnd;
      });

      return {
        week: format(weekStart, "MMM d"),
        scheduled: weekLoads.filter((l) => l.status === "scheduled").length,
        inTransit: weekLoads.filter((l) => l.status === "in-transit").length,
        delivered: weekLoads.filter((l) => l.status === "delivered").length,
        pending: weekLoads.filter((l) => l.status === "pending").length,
        total: weekLoads.length,
      };
    });
  }, [filteredLoads, timeRange]);

  // Monthly trend data with status breakdown (reuses WeeklyTrend shape for chart compatibility)
  const monthlyStatusTrend = useMemo<WeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const months = [] as WeeklyTrend[];

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthLoads = filteredLoads.filter((load) => {
        const loadDate = parseISO(load.loading_date);
        return loadDate >= monthStart && loadDate <= monthEnd;
      });

      months.push({
        week: format(monthDate, "MMM yy"),
        scheduled: monthLoads.filter((l) => l.status === "scheduled").length,
        inTransit: monthLoads.filter((l) => l.status === "in-transit").length,
        delivered: monthLoads.filter((l) => l.status === "delivered").length,
        pending: monthLoads.filter((l) => l.status === "pending").length,
        total: monthLoads.length,
      });
    }

    return months;
  }, [filteredLoads, timeRange]);

  // Time window analysis - categorized for better readability
  const _timeWindowAnalysis = useMemo<TimeWindowData[]>(() => {
    const windows: Record<string, { count: number }> = {};
    filteredLoads.forEach((load) => {
      const category = categorizeTimeWindow(load.time_window);
      if (!windows[category]) {
        windows[category] = { count: 0 };
      }
      windows[category].count += 1;
    });
    return Object.entries(windows)
      .map(([timeWindow, data]) => ({
        timeWindow,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLoads]);

  // Day of week distribution
  const dayOfWeekDistribution = useMemo<DayOfWeekData[]>(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayData: Record<number, { loads: number }> = {};

    filteredLoads.forEach((load) => {
      const loadDate = parseISO(load.loading_date);
      const day = getDay(loadDate);
      if (!dayData[day]) {
        dayData[day] = { loads: 0 };
      }
      dayData[day].loads += 1;
    });

    return days.map((day, index) => ({
      day: day.slice(0, 3),
      loads: dayData[index]?.loads || 0,
    }));
  }, [filteredLoads]);

  // Monthly trend
  const _monthlyTrend = useMemo<MonthlyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const months: MonthlyTrend[] = [];

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthLoads = filteredLoads.filter((load) => {
        const loadDate = parseISO(load.loading_date);
        return loadDate >= monthStart && loadDate <= monthEnd;
      });

      months.push({
        month: format(monthDate, "MMM yyyy"),
        loads: monthLoads.length,
      });
    }

    return months;
  }, [filteredLoads, timeRange]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalLoads = filteredLoads.length;
    const deliveredCount = filteredLoads.filter(
      (l) => l.status === "delivered",
    ).length;
    const deliveryRate =
      totalLoads > 0 ? Math.round((deliveredCount / totalLoads) * 100) : 0;
    const uniqueRoutes = new Set(
      filteredLoads.map((l) => `${l.origin}-${l.destination}`),
    ).size;

    return {
      totalLoads,
      deliveryRate,
      uniqueRoutes,
    };
  }, [filteredLoads]);

  // Planned vs Actual Time Analysis for delivered loads
  const timeVarianceAnalysis = useMemo(() => {
    const deliveredLoads = filteredLoads.filter(
      (l) => l.status === "delivered",
    );

    let onTime = 0;
    let early = 0;
    let slightlyLate = 0; // 1-30 mins late
    let late = 0; // 30+ mins late
    let noData = 0;

    const originVariances: number[] = [];
    const destVariances: number[] = [];
    const routeData: Record<string, { variances: number[]; total: number }> =
      {};

    deliveredLoads.forEach((load) => {
      const times = timeWindowLib.parseTimeWindow(load.time_window);
      if (!times) {
        noData++;
        return;
      }

      // Check destination arrival variance (main delivery metric)
      const destVariance = calculateVarianceMinutes(
        times.destination.plannedArrival,
        times.destination.actualArrival,
      );

      if (destVariance === null) {
        noData++;
        return;
      }

      destVariances.push(destVariance);

      // Categorize the variance
      if (destVariance <= -5) {
        early++; // More than 5 mins early
      } else if (destVariance <= 15) {
        onTime++; // Within 15 mins of planned
      } else if (destVariance <= 30) {
        slightlyLate++; // 15-30 mins late
      } else {
        late++; // Over 30 mins late
      }

      // Origin variance
      const originVariance = calculateVarianceMinutes(
        times.origin.plannedDeparture,
        times.origin.actualDeparture,
      );
      if (originVariance !== null) {
        originVariances.push(originVariance);
      }

      // Route-level data
      const route = load.destination;
      if (!routeData[route]) {
        routeData[route] = { variances: [], total: 0 };
      }
      routeData[route].variances.push(destVariance);
      routeData[route].total++;
    });

    const totalWithData = onTime + early + slightlyLate + late;

    // Distribution data for pie chart
    const distribution: TimeVarianceData[] =
      totalWithData > 0
        ? [
            {
              category: "On Time",
              count: onTime,
              percentage: Math.round((onTime / totalWithData) * 100),
              fill: "#22c55e",
            },
            {
              category: "Early",
              count: early,
              percentage: Math.round((early / totalWithData) * 100),
              fill: "#3b82f6",
            },
            {
              category: "Slightly Late",
              count: slightlyLate,
              percentage: Math.round((slightlyLate / totalWithData) * 100),
              fill: "#f59e0b",
            },
            {
              category: "Late",
              count: late,
              percentage: Math.round((late / totalWithData) * 100),
              fill: "#ef4444",
            },
          ].filter((d) => d.count > 0)
        : [];

    // Calculate average variances
    const avgDestVariance =
      destVariances.length > 0
        ? Math.round(
            destVariances.reduce((a, b) => a + b, 0) / destVariances.length,
          )
        : 0;
    const avgOriginVariance =
      originVariances.length > 0
        ? Math.round(
            originVariances.reduce((a, b) => a + b, 0) / originVariances.length,
          )
        : 0;

    // Route performance data
    const routePerformance: LocationVariance[] = Object.entries(routeData)
      .map(([location, data]) => {
        const avgVar =
          data.variances.reduce((a, b) => a + b, 0) / data.variances.length;
        return {
          location,
          avgVariance: Math.round(avgVar),
          onTimeCount: data.variances.filter((v) => v >= -5 && v <= 15).length,
          lateCount: data.variances.filter((v) => v > 15).length,
          earlyCount: data.variances.filter((v) => v < -5).length,
          totalLoads: data.total,
        };
      })
      .sort((a, b) => b.totalLoads - a.totalLoads)
      .slice(0, 8);

    return {
      distribution,
      onTimeRate:
        totalWithData > 0
          ? Math.round(((onTime + early) / totalWithData) * 100)
          : 0,
      avgDestVariance,
      avgOriginVariance,
      totalAnalyzed: totalWithData,
      noDataCount: noData,
      routePerformance,
      lateCount: slightlyLate + late,
      earlyCount: early,
      onTimeCount: onTime,
    };
  }, [filteredLoads]);

  // Backload Packaging Movements Analysis
  const backloadMovements = useMemo<BackloadMovement[]>(() => {
    const movements: BackloadMovement[] = [];

    filteredLoads.forEach((load) => {
      const backloadInfo = parseBackloadInfo(load.time_window);
      if (backloadInfo && backloadInfo.enabled) {
        movements.push({
          loadId: load.load_id,
          origin: load.origin,
          destination: load.destination,
          backloadDestination: backloadInfo.destination,
          cargoType: backloadInfo.cargoType,
          offloadingDate: backloadInfo.offloadingDate,
          quantities: backloadInfo.quantities || {
            bins: 0,
            crates: 0,
            pallets: 0,
          },
          status: load.status,
          driver: load.driver?.name,
          notes: backloadInfo.notes,
        });
      }
    });

    return movements;
  }, [filteredLoads]);

  // Backload destination distribution
  const backloadDestinationDistribution = useMemo<
    BackloadDestinationData[]
  >(() => {
    const destinations: Record<string, BackloadDestinationData> = {};

    backloadMovements.forEach((movement) => {
      const dest = movement.backloadDestination || "Other";
      if (!destinations[dest]) {
        destinations[dest] = {
          destination: dest,
          totalMovements: 0,
          bins: 0,
          crates: 0,
          pallets: 0,
        };
      }
      destinations[dest].totalMovements += 1;
      destinations[dest].bins += movement.quantities.bins;
      destinations[dest].crates += movement.quantities.crates;
      destinations[dest].pallets += movement.quantities.pallets;
    });

    return Object.values(destinations).sort(
      (a, b) => b.totalMovements - a.totalMovements,
    );
  }, [backloadMovements]);

  // Backload packaging type distribution (for pie chart)
  const backloadPackagingDistribution = useMemo<BackloadDistribution[]>(() => {
    let totalBins = 0;
    let totalCrates = 0;
    let totalPallets = 0;

    backloadMovements.forEach((movement) => {
      totalBins += movement.quantities.bins;
      totalCrates += movement.quantities.crates;
      totalPallets += movement.quantities.pallets;
    });

    const distribution: BackloadDistribution[] = [];
    if (totalBins > 0)
      distribution.push({
        name: "Bins",
        value: totalBins,
        fill: PACKAGING_TYPE_COLORS.Bins,
      });
    if (totalCrates > 0)
      distribution.push({
        name: "Crates",
        value: totalCrates,
        fill: PACKAGING_TYPE_COLORS.Crates,
      });
    if (totalPallets > 0)
      distribution.push({
        name: "Pallets",
        value: totalPallets,
        fill: PACKAGING_TYPE_COLORS.Pallets,
      });

    return distribution.sort((a, b) => b.value - a.value);
  }, [backloadMovements]);

  // Backload cargo type distribution
  const backloadCargoTypeDistribution = useMemo<BackloadCargoTypeData[]>(() => {
    const distribution: Record<string, number> = {};

    backloadMovements.forEach((movement) => {
      distribution[movement.cargoType] =
        (distribution[movement.cargoType] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([cargoType, count]) => ({
        cargoType,
        count,
        fill: BACKLOAD_DESTINATION_COLORS[cargoType] || "#64748b",
      }))
      .sort((a, b) => b.count - a.count);
  }, [backloadMovements]);

  // Backload weekly trend
  const backloadWeeklyTrend = useMemo<BackloadWeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const startDate = subMonths(now, monthsToSubtract);
    const weeks = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 1 },
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekMovements = backloadMovements.filter((movement) => {
        const moveDate = parseISO(movement.offloadingDate);
        return moveDate >= weekStart && moveDate <= weekEnd;
      });

      return {
        week: format(weekStart, "MMM d"),
        movements: weekMovements.length,
        bins: weekMovements.reduce((sum, m) => sum + m.quantities.bins, 0),
        crates: weekMovements.reduce((sum, m) => sum + m.quantities.crates, 0),
        pallets: weekMovements.reduce(
          (sum, m) => sum + m.quantities.pallets,
          0,
        ),
      };
    });
  }, [backloadMovements, timeRange]);

  const backloadMonthlyTrend = useMemo<BackloadWeeklyTrend[]>(() => {
    const now = new Date();
    const monthsToSubtract =
      timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
    const months = [] as BackloadWeeklyTrend[];

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthMovements = backloadMovements.filter((movement) => {
        const moveDate = parseISO(movement.offloadingDate);
        return moveDate >= monthStart && moveDate <= monthEnd;
      });

      months.push({
        week: format(monthDate, "MMM yy"),
        movements: monthMovements.length,
        bins: monthMovements.reduce((sum, m) => sum + m.quantities.bins, 0),
        crates: monthMovements.reduce((sum, m) => sum + m.quantities.crates, 0),
        pallets: monthMovements.reduce((sum, m) => sum + m.quantities.pallets, 0),
      });
    }

    return months;
  }, [backloadMovements, timeRange]);

  // Backload status distribution
  const backloadStatusDistribution = useMemo<BackloadDistribution[]>(() => {
    const distribution: Record<string, number> = {};

    backloadMovements.forEach((movement) => {
      const status =
        movement.status === "in-transit"
          ? "In Transit"
          : movement.status.charAt(0).toUpperCase() + movement.status.slice(1);
      distribution[status] = (distribution[status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      Scheduled: "#3b82f6",
      "In Transit": "#f59e0b",
      Delivered: "#22c55e",
      Pending: "#ef4444",
    };

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      fill: statusColors[name] || "#64748b",
    }));
  }, [backloadMovements]);

  // Backload summary stats
  const backloadSummaryStats = useMemo(() => {
    const totalMovements = backloadMovements.length;
    const totalBins = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.bins,
      0,
    );
    const totalCrates = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.crates,
      0,
    );
    const totalPallets = backloadMovements.reduce(
      (sum, m) => sum + m.quantities.pallets,
      0,
    );
    const totalPackaging = totalBins + totalCrates + totalPallets;
    const deliveredCount = backloadMovements.filter(
      (m) => m.status === "delivered",
    ).length;
    const deliveryRate =
      totalMovements > 0
        ? Math.round((deliveredCount / totalMovements) * 100)
        : 0;
    const uniqueDestinations = new Set(
      backloadMovements.map((m) => m.backloadDestination),
    ).size;

    return {
      totalMovements,
      totalBins,
      totalCrates,
      totalPallets,
      totalPackaging,
      deliveredCount,
      deliveryRate,
      uniqueDestinations,
    };
  }, [backloadMovements]);

  // Backload route analysis (origin -> destination -> backload destination)
  const backloadRouteAnalysis = useMemo(() => {
    const routes: Record<
      string,
      { count: number; bins: number; crates: number; pallets: number }
    > = {};

    backloadMovements.forEach((movement) => {
      const route = `${movement.destination} → ${movement.backloadDestination}`;
      if (!routes[route]) {
        routes[route] = { count: 0, bins: 0, crates: 0, pallets: 0 };
      }
      routes[route].count += 1;
      routes[route].bins += movement.quantities.bins;
      routes[route].crates += movement.quantities.crates;
      routes[route].pallets += movement.quantities.pallets;
    });

    return Object.entries(routes)
      .map(([route, data]) => ({
        route,
        ...data,
        totalPackaging: data.bins + data.crates + data.pallets,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [backloadMovements]);

  if (isLoading) {
    return (
      <MainLayout title="Reports">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading reports data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into load distribution and operational
              efficiency
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onValueChange={(value: "3months" | "6months" | "12months") =>
                setTimeRange(value)
              }
            >
              <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/80 p-1 backdrop-blur-sm">
              <Button
                size="sm"
                variant={granularity === "weekly" ? "default" : "ghost"}
                className="h-8 px-3"
                onClick={() => setGranularity("weekly")}
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={granularity === "monthly" ? "default" : "ghost"}
                className="h-8 px-3"
                onClick={() => setGranularity("monthly")}
              >
                Month
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Report</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({ loads, timeRange, reportType: "full" })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>Complete Report</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "summary",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Executive Summary</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "distribution",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <PieChartIcon className="h-4 w-4 text-purple-500" />
                  <span>Load Distribution</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "routes",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <MapIcon className="h-4 w-4 text-amber-500" />
                  <span>Route Analysis</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportReportsToPdf({
                      loads,
                      timeRange,
                      reportType: "time-analysis",
                    })
                  }
                  className="gap-2 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-cyan-500" />
                  <span>Time Analysis</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => exportVarianceToPdf(loads, timeRange)}
                  className="gap-2 cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Variance (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportVarianceToExcel(loads, timeRange)}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Variance (Excel)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {summaryStats.totalLoads.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Loads</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {summaryStats.deliveryRate}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Delivery Rate
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                {summaryStats.uniqueRoutes}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Unique Routes
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="distribution" className="space-y-6">
          <TabsList className="bg-muted/50 backdrop-blur-sm p-1">
            <TabsTrigger
              value="distribution"
              className="data-[state=active]:bg-background"
            >
              Load Distribution
            </TabsTrigger>
            <TabsTrigger
              value="time"
              className="data-[state=active]:bg-background"
            >
              Time Analysis
            </TabsTrigger>
            <TabsTrigger
              value="backload"
              className="data-[state=active]:bg-background gap-2"
            >
              <Package className="h-4 w-4" />
              Backload Packaging
            </TabsTrigger>
            <TabsTrigger
              value="feedback"
              className="data-[state=active]:bg-background gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Client Feedback
            </TabsTrigger>
          </TabsList>

          <DistributionTab
            cargoDistribution={cargoDistribution}
            statusDistribution={statusDistribution}
            topRoutes={topRoutes}
            weeklyTrend={granularity === "weekly" ? weeklyTrend : monthlyStatusTrend}
            trendLabel={granularity === "weekly" ? "Weekly" : "Monthly"}
          />

          <TimeAnalysisTab
            timeVarianceAnalysis={timeVarianceAnalysis}
            dayOfWeekDistribution={dayOfWeekDistribution}
            originDelayChartData={originDelayChartData}
            destinationDelayChartData={destinationDelayChartData}
            periodPunctualityData={
              granularity === "weekly" ? _weeklyPunctuality : monthlyPunctuality
            }
            trendLabel={granularity === "weekly" ? "Weekly" : "Monthly"}
            filteredLoads={filteredLoads}
            timeRange={timeRange}
          />

          <BackloadAnalyticsTab
            backloadSummaryStats={backloadSummaryStats}
            backloadMovements={backloadMovements}
            backloadPackagingDistribution={backloadPackagingDistribution}
            backloadStatusDistribution={backloadStatusDistribution}
            backloadDestinationDistribution={backloadDestinationDistribution}
            backloadWeeklyTrend={
              granularity === "weekly" ? backloadWeeklyTrend : backloadMonthlyTrend
            }
            trendLabel={granularity === "weekly" ? "Weekly" : "Monthly"}
            backloadRouteAnalysis={backloadRouteAnalysis}
            backloadCargoTypeDistribution={backloadCargoTypeDistribution}
          />

          <ClientFeedbackTab granularity={granularity} timeRange={timeRange} />
        </Tabs>
      </div>
    </MainLayout>
  );
}