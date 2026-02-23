import type { Load } from "@/hooks/useLoads";
import * as timeWindowLib from "@/lib/timeWindow";
import { format, getWeek, parseISO } from "date-fns";
import XLSX from "xlsx-js-style";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a time string (HH:mm or ISO datetime) into total minutes from midnight.
 */
function timeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;

  // HH:mm
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);

  // ISO datetime
  const iso = time.match(/T(\d{2}):(\d{2})/);
  if (iso) return parseInt(iso[1], 10) * 60 + parseInt(iso[2], 10);

  return null;
}

/**
 * Compute variance between planned (HH:mm) and actual (ISO or HH:mm) time.
 * Returns { label, diffMin, isLate }.
 */
function computeVariance(
  planned: string | undefined | null,
  actual: string | undefined | null,
): { label: string; diffMin: number | null; isLate: boolean } {
  const pMin = timeToMinutes(planned);
  const aMin = timeToMinutes(actual);
  if (pMin === null || aMin === null) return { label: "", diffMin: null, isLate: false };

  const diff = aMin - pMin;
  if (diff === 0) return { label: "On time", diffMin: 0, isLate: false };

  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  const tag = diff > 0 ? "late" : "early";
  return { label: `${parts.join(" ")} ${tag}`, diffMin: diff, isLate: diff > 0 };
}

/**
 * Format an ISO timestamp (used for actual times from the DB columns) into
 * a short time string, e.g. "14:35".
 */
function formatActualTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "HH:mm");
  } catch {
    return timestamp;
  }
}

/**
 * Format an ISO timestamp into a full datetime string, e.g. "23 Feb 14:35".
 */
function formatActualDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  try {
    return format(new Date(timestamp), "dd MMM HH:mm");
  } catch {
    return timestamp;
  }
}

/**
 * Build a note explaining whether the time was met or missed.
 */
function buildNote(
  label: string,
  planned: string | undefined | null,
  actual: string | undefined | null,
): string {
  const v = computeVariance(planned, actual);
  if (v.diffMin === null) return "";
  if (v.diffMin === 0) return `${label}: On time`;
  if (v.isLate) return `⚠️ ${label}: ${v.label} — time not met`;
  return `${label}: ${v.label}`;
}

// ---------------------------------------------------------------------------
// Cell styles
// ---------------------------------------------------------------------------

const greenFill = { fill: { fgColor: { rgb: "C6EFCE" } }, font: { color: { rgb: "006100" } } };
const redFill = { fill: { fgColor: { rgb: "FFC7CE" } }, font: { color: { rgb: "9C0006" } } };
const onTimeFill = { fill: { fgColor: { rgb: "DDDDDD" } } };
const amberFill = { fill: { fgColor: { rgb: "FFE699" } }, font: { color: { rgb: "7F6000" } } };
const headerFill = { fill: { fgColor: { rgb: "4472C4" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" as const } };
const sectionHeaderFill = { fill: { fgColor: { rgb: "D6E4F0" } }, font: { bold: true } };

function varianceStyle(diffMin: number | null) {
  if (diffMin === null) return undefined;
  if (diffMin === 0) return onTimeFill;
  return diffMin > 0 ? redFill : greenFill;
}

function noteStyle(isLate: boolean) {
  return isLate ? amberFill : undefined;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface ExportTimeComparisonOptions {
  filename?: string;
  weekNumber?: number;
  year?: number;
}

/**
 * Export loads with a detailed time comparison between planned and actual
 * departure / arrival times for both loading and offloading points.
 * Includes a "Notes" column flagging any times that were not met.
 */
export function exportTimeComparisonToExcel(
  loads: Load[],
  options: ExportTimeComparisonOptions = {},
): void {
  const weekNum = options.weekNumber ?? getWeek(new Date(), { weekStartsOn: 1 });
  const yr = options.year ?? new Date().getFullYear();
  const filename = options.filename ?? `time-comparison-week-${weekNum}-${yr}`;

  // Build data rows
  const excelData = loads.map((load) => {
    const tw = timeWindowLib.parseTimeWindow(load.time_window);

    // For actual times, prefer the DB column (geofence/manual) then fallback to
    // the time_window JSON actualArrival/actualDeparture fields.
    const actualLoadingArrival = load.actual_loading_arrival || tw.origin.actualArrival || "";
    const actualLoadingDeparture = load.actual_loading_departure || tw.origin.actualDeparture || "";
    const actualOffloadingArrival = load.actual_offloading_arrival || tw.destination.actualArrival || "";
    const actualOffloadingDeparture = load.actual_offloading_departure || tw.destination.actualDeparture || "";

    // Compute variances
    const loadArrVar = computeVariance(tw.origin.plannedArrival, actualLoadingArrival);
    const loadDepVar = computeVariance(tw.origin.plannedDeparture, actualLoadingDeparture);
    const offloadArrVar = computeVariance(tw.destination.plannedArrival, actualOffloadingArrival);
    const offloadDepVar = computeVariance(tw.destination.plannedDeparture, actualOffloadingDeparture);

    // Build notes
    const notes: string[] = [];
    const n1 = buildNote("Loading Arrival", tw.origin.plannedArrival, actualLoadingArrival);
    const n2 = buildNote("Loading Departure", tw.origin.plannedDeparture, actualLoadingDeparture);
    const n3 = buildNote("Offloading Arrival", tw.destination.plannedArrival, actualOffloadingArrival);
    const n4 = buildNote("Offloading Departure", tw.destination.plannedDeparture, actualOffloadingDeparture);
    if (n1) notes.push(n1);
    if (n2) notes.push(n2);
    if (n3) notes.push(n3);
    if (n4) notes.push(n4);

    const hasLate = loadArrVar.isLate || loadDepVar.isLate || offloadArrVar.isLate || offloadDepVar.isLate;

    return {
      row: {
        "Load ID": load.load_id,
        Status: load.status,
        Vehicle: load.fleet_vehicle?.vehicle_id || "",
        Driver: load.driver?.name || "",
        Origin: load.origin,
        Destination: load.destination,
        "Loading Date": format(parseISO(load.loading_date), "dd/MM/yyyy"),
        // Loading times
        "Planned Loading Arrival": tw.origin.plannedArrival || "",
        "Actual Loading Arrival": formatActualTime(actualLoadingArrival),
        "Loading Arrival Variance": loadArrVar.label,
        "Planned Loading Departure": tw.origin.plannedDeparture || "",
        "Actual Loading Departure": formatActualTime(actualLoadingDeparture),
        "Loading Departure Variance": loadDepVar.label,
        // Offloading times
        "Planned Offloading Arrival": tw.destination.plannedArrival || "",
        "Actual Offloading Arrival": formatActualTime(actualOffloadingArrival),
        "Offloading Arrival Variance": offloadArrVar.label,
        "Planned Offloading Departure": tw.destination.plannedDeparture || "",
        "Actual Offloading Departure": formatActualTime(actualOffloadingDeparture),
        "Offloading Departure Variance": offloadDepVar.label,
        // Full timestamps for reference
        "Loading Arrival (Full)": formatActualDateTime(actualLoadingArrival),
        "Loading Departure (Full)": formatActualDateTime(actualLoadingDeparture),
        "Offloading Arrival (Full)": formatActualDateTime(actualOffloadingArrival),
        "Offloading Departure (Full)": formatActualDateTime(actualOffloadingDeparture),
        // Notes
        Notes: notes.join(" | "),
      },
      variances: { loadArrVar, loadDepVar, offloadArrVar, offloadDepVar },
      hasLate,
    };
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Title row
  const titleRow = [`Time Comparison Report — Week ${weekNum}, ${yr}`];
  const generatedRow = [`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`];

  // Main sheet
  const worksheet = XLSX.utils.aoa_to_sheet([titleRow, generatedRow, []]);
  XLSX.utils.sheet_add_json(worksheet, excelData.map((d) => d.row), { origin: "A4" });

  // Style title
  worksheet["A1"] = { v: titleRow[0], s: { font: { bold: true, sz: 14 } } };
  worksheet["A2"] = { v: generatedRow[0], s: { font: { italic: true, color: { rgb: "666666" } } } };

  // Style header row (row 4, index 3)
  const headerKeys = Object.keys(excelData[0]?.row ?? {});
  headerKeys.forEach((_, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx });
    const cell = worksheet[cellRef];
    if (cell) cell.s = headerFill;
  });

  // Variance column indices within the data (0-based among data columns):
  // Col 9 = Loading Arrival Variance
  // Col 12 = Loading Departure Variance
  // Col 15 = Offloading Arrival Variance
  // Col 18 = Offloading Departure Variance
  // Col 23 = Notes
  const varianceCols = [9, 12, 15, 18];
  const varianceKeys = ["loadArrVar", "loadDepVar", "offloadArrVar", "offloadDepVar"] as const;

  excelData.forEach((item, rowIdx) => {
    const excelRow = rowIdx + 4; // title=0, generated=1, blank=2, header=3

    // Colour variance cells
    varianceKeys.forEach((key, ki) => {
      const col = varianceCols[ki];
      const cellRef = XLSX.utils.encode_cell({ r: excelRow, c: col });
      const cell = worksheet[cellRef];
      if (cell) {
        const style = varianceStyle(item.variances[key].diffMin);
        if (style) cell.s = style;
      }
    });

    // Colour Notes column if any time was late
    const noteCol = headerKeys.indexOf("Notes");
    if (noteCol >= 0) {
      const cellRef = XLSX.utils.encode_cell({ r: excelRow, c: noteCol });
      const cell = worksheet[cellRef];
      if (cell && item.hasLate) {
        cell.s = noteStyle(true);
      }
    }
  });

  // Column widths
  worksheet["!cols"] = [
    { wch: 14 }, // Load ID
    { wch: 12 }, // Status
    { wch: 12 }, // Vehicle
    { wch: 18 }, // Driver
    { wch: 18 }, // Origin
    { wch: 18 }, // Destination
    { wch: 12 }, // Loading Date
    { wch: 14 }, // Planned Loading Arrival
    { wch: 14 }, // Actual Loading Arrival
    { wch: 18 }, // Loading Arrival Variance
    { wch: 14 }, // Planned Loading Departure
    { wch: 14 }, // Actual Loading Departure
    { wch: 18 }, // Loading Departure Variance
    { wch: 14 }, // Planned Offloading Arrival
    { wch: 14 }, // Actual Offloading Arrival
    { wch: 18 }, // Offloading Arrival Variance
    { wch: 14 }, // Planned Offloading Departure
    { wch: 14 }, // Actual Offloading Departure
    { wch: 18 }, // Offloading Departure Variance
    { wch: 18 }, // Loading Arrival (Full)
    { wch: 18 }, // Loading Departure (Full)
    { wch: 18 }, // Offloading Arrival (Full)
    { wch: 18 }, // Offloading Departure (Full)
    { wch: 60 }, // Notes
  ];

  // Merge title
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Time Comparison");

  // -------------------------------------------------------------------------
  // Summary sheet: aggregate stats
  // -------------------------------------------------------------------------
  const totalLoads = excelData.length;
  const lateLoadingArrivals = excelData.filter((d) => d.variances.loadArrVar.isLate).length;
  const lateLoadingDepartures = excelData.filter((d) => d.variances.loadDepVar.isLate).length;
  const lateOffloadingArrivals = excelData.filter((d) => d.variances.offloadArrVar.isLate).length;
  const lateOffloadingDepartures = excelData.filter((d) => d.variances.offloadDepVar.isLate).length;
  const anyLate = excelData.filter((d) => d.hasLate).length;

  const avgVariance = (key: typeof varianceKeys[number]) => {
    const vals = excelData.map((d) => d.variances[key].diffMin).filter((v): v is number => v !== null);
    if (vals.length === 0) return "N/A";
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return `${Math.round(avg)} min`;
  };

  const summaryData = [
    { Metric: "Total Loads", Value: totalLoads },
    { Metric: "", Value: "" },
    { Metric: "Late Loading Arrivals", Value: lateLoadingArrivals },
    { Metric: "Late Loading Departures", Value: lateLoadingDepartures },
    { Metric: "Late Offloading Arrivals", Value: lateOffloadingArrivals },
    { Metric: "Late Offloading Departures", Value: lateOffloadingDepartures },
    { Metric: "Loads with Any Late Time", Value: anyLate },
    { Metric: "", Value: "" },
    { Metric: "Avg Loading Arrival Variance", Value: avgVariance("loadArrVar") },
    { Metric: "Avg Loading Departure Variance", Value: avgVariance("loadDepVar") },
    { Metric: "Avg Offloading Arrival Variance", Value: avgVariance("offloadArrVar") },
    { Metric: "Avg Offloading Departure Variance", Value: avgVariance("offloadDepVar") },
    { Metric: "", Value: "" },
    { Metric: "Report Generated", Value: format(new Date(), "dd/MM/yyyy HH:mm") },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // -------------------------------------------------------------------------
  // Late-only sheet: just the loads that missed their planned times
  // -------------------------------------------------------------------------
  const lateLoads = excelData.filter((d) => d.hasLate);
  if (lateLoads.length > 0) {
    const lateSheet = XLSX.utils.json_to_sheet(lateLoads.map((d) => d.row));
    lateSheet["!cols"] = worksheet["!cols"];

    // Style header
    headerKeys.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      const cell = lateSheet[cellRef];
      if (cell) cell.s = sectionHeaderFill;
    });

    XLSX.utils.book_append_sheet(workbook, lateSheet, "Late Times Only");
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
