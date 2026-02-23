import type { Load } from "@/hooks/useLoads";
import {
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as timeWindowLib from "@/lib/timeWindow";

// Type extension for jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface ReportOptions {
  loads: Load[];
  timeRange: "3months" | "6months" | "12months";
  reportType: "summary" | "distribution" | "routes" | "time-analysis" | "full";
}

interface CargoDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface RouteData {
  route: string;
  loads: number;
}

interface DayOfWeekData {
  day: string;
  loads: number;
}

interface MonthlyTrend {
  month: string;
  loads: number;
}

const CARGO_LABELS: Record<string, string> = {
  VanSalesRetail: "Van Sales/Retail",
  Retail: "Retail",
  Vendor: "Vendor",
  RetailVendor: "Retail Vendor",
  Fertilizer: "Fertilizer",
  Export: "Export",
  BV: "BV (Backload)",
  CBC: "CBC (Backload)",
  Packaging: "Packaging (Backload)",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  "in-transit": "In Transit",
  delivered: "Delivered",
  pending: "Pending",
};

function getFilteredLoads(
  loads: Load[],
  timeRange: ReportOptions["timeRange"],
): Load[] {
  const now = new Date();
  const monthsToSubtract =
    timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
  const startDate = subMonths(now, monthsToSubtract);

  return loads.filter((load) => {
    const loadDate = parseISO(load.loading_date);
    return loadDate >= startDate && loadDate <= now;
  });
}

function calculateCargoDistribution(loads: Load[]): CargoDistribution[] {
  const distribution: Record<string, number> = {};
  loads.forEach((load) => {
    distribution[load.cargo_type] = (distribution[load.cargo_type] || 0) + 1;
  });

  const total = loads.length;
  return Object.entries(distribution)
    .map(([name, value]) => ({
      name: CARGO_LABELS[name] || name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function calculateStatusDistribution(loads: Load[]): StatusDistribution[] {
  const distribution: Record<string, number> = {};
  loads.forEach((load) => {
    distribution[load.status] = (distribution[load.status] || 0) + 1;
  });

  const total = loads.length;
  return Object.entries(distribution).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
  }));
}

function calculateTopRoutes(loads: Load[]): RouteData[] {
  const routes: Record<string, { loads: number }> = {};
  loads.forEach((load) => {
    const route = `${load.origin} → ${load.destination}`;
    if (!routes[route]) {
      routes[route] = { loads: 0 };
    }
    routes[route].loads += 1;
  });
  return Object.entries(routes)
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.loads - a.loads)
    .slice(0, 10);
}

function calculateDayOfWeekDistribution(loads: Load[]): DayOfWeekData[] {
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

  loads.forEach((load) => {
    const loadDate = parseISO(load.loading_date);
    const day = getDay(loadDate);
    if (!dayData[day]) {
      dayData[day] = { loads: 0 };
    }
    dayData[day].loads += 1;
  });

  return days.map((day, index) => ({
    day,
    loads: dayData[index]?.loads || 0,
  }));
}

function calculateMonthlyTrend(
  loads: Load[],
  timeRange: ReportOptions["timeRange"],
): MonthlyTrend[] {
  const now = new Date();
  const monthsToSubtract =
    timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12;
  const months: MonthlyTrend[] = [];

  for (let i = monthsToSubtract - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const monthLoads = loads.filter((load) => {
      const loadDate = parseISO(load.loading_date);
      return loadDate >= monthStart && loadDate <= monthEnd;
    });

    months.push({
      month: format(monthDate, "MMM yyyy"),
      loads: monthLoads.length,
    });
  }

  return months;
}

function calculateSummaryStats(loads: Load[]) {
  const totalLoads = loads.length;
  const deliveredCount = loads.filter((l) => l.status === "delivered").length;
  const deliveryRate =
    totalLoads > 0 ? Math.round((deliveredCount / totalLoads) * 100) : 0;
  const uniqueRoutes = new Set(loads.map((l) => `${l.origin}-${l.destination}`))
    .size;

  return {
    totalLoads,
    deliveryRate,
    uniqueRoutes,
  };
}

/**
 * Calculate variance in minutes between planned and actual times
 * Returns null if either time is missing or invalid
 */
function calculateVarianceMinutes(
  planned: string | null | undefined,
  actual: string | null | undefined,
): number | null {
  if (!planned || !actual) return null;

  try {
    // Try parsing as ISO date first
    const parseTime = (timeStr: string): Date | null => {
      const iso = new Date(timeStr);
      if (!isNaN(iso.getTime())) return iso;

      // Try HH:mm format
      const hm = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (hm) {
        const d = new Date();
        d.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0);
        return d;
      }

      // Try HH:mm AM/PM format
      const ampm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (ampm) {
        const d = new Date();
        let h = parseInt(ampm[1]);
        const mins = parseInt(ampm[2]);
        const period = ampm[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        d.setHours(h, mins, 0, 0);
        return d;
      }

      return null;
    };

    const plannedDate = parseTime(planned);
    const actualDate = parseTime(actual);

    if (!plannedDate || !actualDate) return null;

    return Math.round((actualDate.getTime() - plannedDate.getTime()) / (60 * 1000));
  } catch {
    return null;
  }
}

export function exportReportsToPdf({
  loads,
  timeRange,
  reportType,
}: ReportOptions): void {
  const filteredLoads = getFilteredLoads(loads, timeRange);
  const doc = new jsPDF();

  const timeRangeLabel =
    timeRange === "3months"
      ? "3 Months"
      : timeRange === "6months"
        ? "6 Months"
        : "12 Months";
  const reportDate = format(new Date(), "MMMM d, yyyy");

  // Colors
  const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
  const secondaryColor: [number, number, number] = [34, 197, 94]; // Green
  const textColor: [number, number, number] = [55, 65, 81];
  const mutedColor: [number, number, number] = [107, 114, 128];

  let yPos = 20;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 220, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Load Flow Analytics Report", 15, 25);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${reportDate} | Period: Last ${timeRangeLabel}`, 15, 34);

  yPos = 55;

  // Summary Statistics Section
  const stats = calculateSummaryStats(filteredLoads);

  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 15, yPos);

  yPos += 10;

  // Summary cards
  const summaryData = [
    ["Total Loads", stats.totalLoads.toString()],
    ["Delivery Rate", `${stats.deliveryRate}%`],
    ["Unique Routes", stats.uniqueRoutes.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { cellWidth: 50 },
    },
    margin: { left: 15, right: 15 },
    tableWidth: 110,
  });

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

  // Status Distribution
  if (
    reportType === "full" ||
    reportType === "summary" ||
    reportType === "distribution"
  ) {
    const statusDist = calculateStatusDistribution(filteredLoads);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Load Status Distribution", 15, yPos);

    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [["Status", "Count", "Percentage"]],
      body: statusDist.map((s) => [
        s.name,
        s.value.toString(),
        `${s.percentage}%`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: secondaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 15, right: 15 },
      tableWidth: 110,
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Cargo Distribution
  if (reportType === "full" || reportType === "distribution") {
    const cargoDist = calculateCargoDistribution(filteredLoads);

    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Cargo Type Distribution", 15, yPos);

    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [["Cargo Type", "Count", "Percentage"]],
      body: cargoDist.map((c) => [
        c.name,
        c.value.toString(),
        `${c.percentage}%`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [139, 92, 246], // Purple
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Top Routes
  if (reportType === "full" || reportType === "routes") {
    const topRoutes = calculateTopRoutes(filteredLoads);

    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top 10 Routes by Load Volume", 15, yPos);

    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [["Route", "Loads"]],
      body: topRoutes.map((r) => [
        r.route,
        r.loads.toString(),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [245, 158, 11], // Amber
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 40, halign: "center" },
      },
      margin: { left: 15, right: 15 },
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Day of Week Analysis
  if (reportType === "full" || reportType === "time-analysis") {
    const dayDist = calculateDayOfWeekDistribution(filteredLoads);

    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Day of Week Analysis", 15, yPos);

    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [["Day", "Total Loads"]],
      body: dayDist.map((d) => [
        d.day,
        d.loads.toString(),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [6, 182, 212], // Cyan
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 60 },
        1: { cellWidth: 60, halign: "center" },
      },
      margin: { left: 15, right: 15 },
      tableWidth: 140,
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Monthly Trend
  if (reportType === "full" || reportType === "time-analysis") {
    const monthlyTrend = calculateMonthlyTrend(filteredLoads, timeRange);

    if (yPos > 180) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Load Trends", 15, yPos);

    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [["Month", "Total Loads"]],
      body: monthlyTrend.map((m) => [
        m.month,
        m.loads.toString(),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [236, 72, 153], // Pink
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: textColor,
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 60 },
        1: { cellWidth: 60, halign: "center" },
      },
      margin: { left: 15, right: 15 },
      tableWidth: 140,
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(
      `Page ${i} of ${pageCount} | Load Flow Analytics Report | Generated ${reportDate}`,
      105,
      290,
      { align: "center" },
    );
  }

  // Generate filename
  const reportTypeLabel =
    reportType === "full"
      ? "Complete"
      : reportType
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
  const filename = `LoadFlow_${reportTypeLabel}_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;

  doc.save(filename);
}

// Compact variance PDF (daily/weekly + top delays by origin/destination)
export function exportVarianceToPdf(loads: Load[], timeRange: ReportOptions["timeRange"] = "3months"): void {
  const filteredLoads = getFilteredLoads(loads, timeRange);
  const doc = new jsPDF();
  const primary: [number, number, number] = [99, 102, 241];
  const text: [number, number, number] = [55, 65, 81];
  const reportDate = format(new Date(), "MMMM d, yyyy");

  // Header
  doc.setFillColor(...primary);
  doc.rect(0, 0, 220, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Punctuality Variance Report", 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated: ${reportDate}`, 14, 24);

  // Use the shared parser
  const getTimeWindow = (load: Load): timeWindowLib.TimeWindowDataFull | null => {
    return timeWindowLib.parseTimeWindowOrNull(load.time_window);
  };

  // Daily summary
  const byDay = new Map<string,{
    loads: number;
    oa: number; oaN: number;
    od: number; odN: number;
    da: number; daN: number;
    dd: number; ddN: number;
    oLate: number; dLate: number;
  }>();

  for (const l of filteredLoads) {
    const k = format(parseISO(l.loading_date), "yyyy-MM-dd");
    const tw = getTimeWindow(l);
    if (!tw) continue;

    const oa = calculateVarianceMinutes(tw.origin.plannedArrival, tw.origin.actualArrival);
    const od = calculateVarianceMinutes(tw.origin.plannedDeparture, tw.origin.actualDeparture);
    const da = calculateVarianceMinutes(tw.destination.plannedArrival, tw.destination.actualArrival);
    const dd = calculateVarianceMinutes(tw.destination.plannedDeparture, tw.destination.actualDeparture);

    if (!byDay.has(k)) {
      byDay.set(k, {
        loads: 0, oa: 0, oaN: 0, od: 0, odN: 0,
        da: 0, daN: 0, dd: 0, ddN: 0, oLate: 0, dLate: 0
      });
    }
    
    const a = byDay.get(k)!;
    a.loads++;
    
    if (oa !== null) {
      a.oa += oa;
      a.oaN++;
      if (oa > 15) a.oLate++;
    }
    if (od !== null) {
      a.od += od;
      a.odN++;
      if (od > 15) a.oLate++;
    }
    if (da !== null) {
      a.da += da;
      a.daN++;
      if (da > 15) a.dLate++;
    }
    if (dd !== null) {
      a.dd += dd;
      a.ddN++;
      if (dd > 15) a.dLate++;
    }
  }

  const dailyRows = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => [
      date,
      v.loads.toString(),
      v.oaN ? Math.round(v.oa / v.oaN).toString() : "-",
      v.odN ? Math.round(v.od / v.odN).toString() : "-",
      v.daN ? Math.round(v.da / v.daN).toString() : "-",
      v.ddN ? Math.round(v.dd / v.ddN).toString() : "-",
      v.oLate.toString(),
      v.dLate.toString(),
    ]);

  autoTable(doc, {
    startY: 34,
    head: [["Date", "Loads", "Avg OA", "Avg OD", "Avg DA", "Avg DD", "Origin Late", "Dest Late"]],
    body: dailyRows,
    theme: "grid",
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { textColor: text, fontSize: 9 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 12, right: 12 },
  });

  // Delays by Origin/Destination (top 10)
  const originSums: Record<string, number> = {};
  const destSums: Record<string, number> = {};

  for (const l of filteredLoads) {
    const tw = getTimeWindow(l);
    if (!tw) continue;

    const oa = calculateVarianceMinutes(tw.origin.plannedArrival, tw.origin.actualArrival);
    const od = calculateVarianceMinutes(tw.origin.plannedDeparture, tw.origin.actualDeparture);
    const da = calculateVarianceMinutes(tw.destination.plannedArrival, tw.destination.actualArrival);
    const dd = calculateVarianceMinutes(tw.destination.plannedDeparture, tw.destination.actualDeparture);

    const add = (map: Record<string, number>, key: string, value: number | null) => {
      if (value !== null && value > 15) {
        map[key] = (map[key] || 0) + value;
      }
    };

    add(originSums, l.origin, oa);
    add(originSums, l.origin, od);
    add(destSums, l.destination, da);
    add(destSums, l.destination, dd);
  }

  const topO = Object.entries(originSums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => [k, v.toString()]);

  const topD = Object.entries(destSums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => [k, v.toString()]);

  let y = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY 
    ? (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10 
    : 34;
    
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  
  doc.setTextColor(...primary);
  doc.setFontSize(12);
  doc.text("Delays by Origin (Total Minutes)", 12, y);
  y += 4;
  
  autoTable(doc, {
    startY: y,
    head: [["Origin", "Total Delay (min)"]],
    body: topO,
    theme: "grid",
    headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { textColor: text, fontSize: 9 },
    margin: { left: 12, right: 12 },
    tableWidth: 90,
  });

  y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 6;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  
  doc.setTextColor(...primary);
  doc.setFontSize(12);
  doc.text("Delays by Destination (Total Minutes)", 12, y);
  y += 4;
  
  autoTable(doc, {
    startY: y,
    head: [["Destination", "Total Delay (min)"]],
    body: topD,
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { textColor: text, fontSize: 9 },
    margin: { left: 12, right: 12 },
    tableWidth: 110,
  });

  doc.save(`variance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// Punctuality details PDF (per-load planned vs actual with variances)
export function exportPunctualityToPdf(loads: Load[], timeRange: ReportOptions["timeRange"] = "3months"): void {
  const filteredLoads = getFilteredLoads(loads, timeRange);
  const doc = new jsPDF();
  const primary: [number, number, number] = [99, 102, 241];
  const text: [number, number, number] = [55, 65, 81];
  const reportDate = format(new Date(), "MMMM d, yyyy");

  // Header
  doc.setFillColor(...primary);
  doc.rect(0, 0, 220, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Punctuality Details (Planned vs Actual)", 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated: ${reportDate}`, 14, 24);

  // Use the shared parser
  const getTimeWindow = (load: Load): timeWindowLib.TimeWindowDataFull | null => {
    return timeWindowLib.parseTimeWindowOrNull(load.time_window);
  };

  const getVarianceString = (planned?: string | null, actual?: string | null): string => {
    const minutes = calculateVarianceMinutes(planned, actual);
    return minutes !== null ? minutes.toString() : "";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (const l of filteredLoads) {
    const tw = getTimeWindow(l);
    const base = [
      l.load_id,
      l.fleet_vehicle?.vehicle_id || "",
      l.origin,
      l.destination,
      format(parseISO(l.loading_date), "yyyy-MM-dd"),
      format(parseISO(l.offloading_date), "yyyy-MM-dd"),
      l.status,
    ];

    if (tw) {
      rows.push([
        ...base,
        tw.origin.plannedArrival || "",
        tw.origin.actualArrival || "",
        getVarianceString(tw.origin.plannedArrival, tw.origin.actualArrival),
        tw.origin.plannedDeparture || "",
        tw.origin.actualDeparture || "",
        getVarianceString(tw.origin.plannedDeparture, tw.origin.actualDeparture),
        tw.destination.plannedArrival || "",
        tw.destination.actualArrival || "",
        getVarianceString(tw.destination.plannedArrival, tw.destination.actualArrival),
        tw.destination.plannedDeparture || "",
        tw.destination.actualDeparture || "",
        getVarianceString(tw.destination.plannedDeparture, tw.destination.actualDeparture),
      ]);
    } else {
      rows.push([...base, "", "", "", "", "", "", "", "", "", "", "", ""]);
    }
  }

  autoTable(doc, {
    startY: 34,
    head: [[
      "Load ID", "Vehicle", "Origin", "Destination", "Loading Date", "Offloading Date", "Status",
      "O Plan Arr", "O Act Arr", "O Var (min)",
      "O Plan Dep", "O Act Dep", "O Var (min)",
      "D Plan Arr", "D Act Arr", "D Var (min)",
      "D Plan Dep", "D Act Dep", "D Var (min)",
    ]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: text, fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 8, right: 8 },
  });

  doc.save(`punctuality-details-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export type { ReportOptions };