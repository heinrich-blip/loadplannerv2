import type { Load } from "@/hooks/useLoads";
import * as timeWindowLib from "@/lib/timeWindow";
import { format, getWeek, parseISO } from "date-fns";
import XLSX from "xlsx-js-style";

// Status labels
const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  "in-transit": "In Transit",
  pending: "Pending",
  delivered: "Delivered",
};

// Cargo type labels
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

interface ExportOptions {
  filename?: string;
  sheetName?: string;
  weekNumber?: number;
  year?: number;
}

// ---------------------------------------------------------------------------
// Variance helpers
// ---------------------------------------------------------------------------

/**
 * Parse a time string (HH:mm or ISO datetime) into total minutes from midnight.
 * Returns null if the value is empty or unparseable.
 */
function timeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;

  // Try HH:mm
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);

  // Try ISO datetime – extract the time portion
  const iso = time.match(/T(\d{2}):(\d{2})/);
  if (iso) return parseInt(iso[1], 10) * 60 + parseInt(iso[2], 10);

  return null;
}

/**
 * Return a human-readable variance string and a sign indicator.
 *  - negative diff → early (actual before planned)
 *  - positive diff  → late  (actual after planned)
 */
function computeVariance(
  planned: string | undefined | null,
  actual: string | undefined | null,
): { label: string; diffMin: number | null } {
  const pMin = timeToMinutes(planned);
  const aMin = timeToMinutes(actual);
  if (pMin === null || aMin === null) return { label: "", diffMin: null };

  const diff = aMin - pMin; // positive = late
  if (diff === 0) return { label: "On time", diffMin: 0 };

  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  const tag = diff > 0 ? "late" : "early";
  return { label: `${parts.join(" ")} ${tag}`, diffMin: diff };
}

// Cell style helpers
const greenFill = { fill: { fgColor: { rgb: "C6EFCE" } }, font: { color: { rgb: "006100" } } };
const redFill   = { fill: { fgColor: { rgb: "FFC7CE" } }, font: { color: { rgb: "9C0006" } } };
const onTimeFill = { fill: { fgColor: { rgb: "DDDDDD" } } };

function varianceStyle(diffMin: number | null) {
  if (diffMin === null) return undefined;
  if (diffMin === 0) return onTimeFill;
  return diffMin > 0 ? redFill : greenFill;
}

export function exportLoadsToExcel(
  loads: Load[],
  options: ExportOptions = {},
): void {
  const weekNum = options.weekNumber ?? getWeek(new Date(), { weekStartsOn: 1 });
  const yr = options.year ?? new Date().getFullYear();
  const {
    filename = `loads-week-${weekNum}-${yr}`,
    sheetName = `Week ${weekNum}`,
  } = options;

  // Transform loads data for Excel
  const excelData = loads.map((load) => {
    const timeWindow = timeWindowLib.parseTimeWindow(load.time_window);
    const isBackload = load.load_id.startsWith("BL-");

    // Build backload quantities string
    let backloadQuantities = "";
    if (timeWindow.backload?.quantities) {
      const { bins, crates, pallets } = timeWindow.backload.quantities;
      const parts: string[] = [];
      if (bins > 0) parts.push(`${bins} bins`);
      if (crates > 0) parts.push(`${crates} crates`);
      if (pallets > 0) parts.push(`${pallets} pallets`);
      backloadQuantities = parts.join(", ");
    }

    // Compute variances
    const oArrVar = computeVariance(timeWindow.origin.plannedArrival, timeWindow.origin.actualArrival);
    const oDepVar = computeVariance(timeWindow.origin.plannedDeparture, timeWindow.origin.actualDeparture);
    const dArrVar = computeVariance(timeWindow.destination.plannedArrival, timeWindow.destination.actualArrival);
    const dDepVar = computeVariance(timeWindow.destination.plannedDeparture, timeWindow.destination.actualDeparture);

    return {
      row: {
        "Load ID": load.load_id,
        Type: isBackload ? "Backload" : "Primary",
        Status: statusLabels[load.status] || load.status,
        Origin: load.origin,
        Destination: load.destination,
        "Cargo Type": cargoLabels[load.cargo_type] || load.cargo_type,
        Quantity: load.quantity,
        "Weight (T)": load.weight,
        "Loading Date": format(parseISO(load.loading_date), "dd/MM/yyyy"),
        "Offloading Date": format(parseISO(load.offloading_date), "dd/MM/yyyy"),
        // Origin times: planned → actual → variance
        "Origin Planned Arrival": timeWindow.origin.plannedArrival,
        "Origin Actual Arrival": timeWindow.origin.actualArrival,
        "Origin Arrival Variance": oArrVar.label,
        "Origin Planned Departure": timeWindow.origin.plannedDeparture,
        "Origin Actual Departure": timeWindow.origin.actualDeparture,
        "Origin Departure Variance": oDepVar.label,
        // Destination times: planned → actual → variance
        "Dest Planned Arrival": timeWindow.destination.plannedArrival,
        "Dest Actual Arrival": timeWindow.destination.actualArrival,
        "Dest Arrival Variance": dArrVar.label,
        "Dest Planned Departure": timeWindow.destination.plannedDeparture,
        "Dest Actual Departure": timeWindow.destination.actualDeparture,
        "Dest Departure Variance": dDepVar.label,
        // Other columns
        Vehicle: load.fleet_vehicle?.vehicle_id || "",
        "Vehicle Type": load.fleet_vehicle?.type || "",
        Driver: load.driver?.name || "",
        "Driver Contact": load.driver?.contact || "",
        "Special Handling": load.special_handling?.join(", ") || "",
        Notes: load.notes || "",
        "Has Planned Backload": timeWindow.backload?.enabled ? "Yes" : "No",
        "Backload Destination": timeWindow.backload?.destination || "",
        "Backload Cargo Type": timeWindow.backload?.cargoType
          ? cargoLabels[timeWindow.backload.cargoType] ||
            timeWindow.backload.cargoType
          : "",
        "Backload Offloading Date": timeWindow.backload?.offloadingDate || "",
        "Backload Quantities": backloadQuantities,
        "Backload Notes": timeWindow.backload?.notes || "",
      },
      variances: { oArrVar, oDepVar, dArrVar, dDepVar },
    };
  });

  // Variance column indices (0-based within the data columns)
  // Columns: 0-Load ID ... 12-Origin Arrival Variance, 15-Origin Departure Variance,
  //          18-Dest Arrival Variance, 21-Dest Departure Variance
  const varianceCols = [12, 15, 18, 21];
  const varianceKeys = ["oArrVar", "oDepVar", "dArrVar", "dDepVar"] as const;

  // Week info for title
  const titleRow = [
    `Matanuska Local Planning - Week ${weekNum}, ${yr}`,
  ];

  // Create workbook and worksheet with title row
  const workbook = XLSX.utils.book_new();

  // Create worksheet with title at top
  const worksheet = XLSX.utils.aoa_to_sheet([titleRow, []]);

  // Add the data starting from row 3 (after title and blank row)
  XLSX.utils.sheet_add_json(worksheet, excelData.map(d => d.row), { origin: "A3" });

  // Apply conditional fill to variance cells
  // Data starts at row index 3 (0-based: row 0=title, 1=blank, 2=headers, 3+=data)
  excelData.forEach((item, rowIdx) => {
    const excelRow = rowIdx + 3; // 0-based sheet row (title=0, blank=1, header=2)
    varianceKeys.forEach((key, ki) => {
      const col = varianceCols[ki];
      const cellRef = XLSX.utils.encode_cell({ r: excelRow, c: col });
      const cell = worksheet[cellRef];
      if (cell) {
        const style = varianceStyle(item.variances[key].diffMin);
        if (style) cell.s = style;
      }
    });
  });

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Load ID
    { wch: 10 }, // Type
    { wch: 12 }, // Status
    { wch: 20 }, // Origin
    { wch: 20 }, // Destination
    { wch: 18 }, // Cargo Type
    { wch: 10 }, // Quantity
    { wch: 10 }, // Weight
    { wch: 12 }, // Loading Date
    { wch: 14 }, // Offloading Date
    { wch: 14 }, // Origin Planned Arr
    { wch: 14 }, // Origin Actual Arr
    { wch: 18 }, // Origin Arr Variance
    { wch: 14 }, // Origin Planned Dep
    { wch: 14 }, // Origin Actual Dep
    { wch: 18 }, // Origin Dep Variance
    { wch: 14 }, // Dest Planned Arr
    { wch: 14 }, // Dest Actual Arr
    { wch: 18 }, // Dest Arr Variance
    { wch: 14 }, // Dest Planned Dep
    { wch: 14 }, // Dest Actual Dep
    { wch: 18 }, // Dest Dep Variance
    { wch: 12 }, // Vehicle
    { wch: 12 }, // Vehicle Type
    { wch: 20 }, // Driver
    { wch: 15 }, // Driver Contact
    { wch: 25 }, // Special Handling
    { wch: 40 }, // Notes
    { wch: 18 }, // Has Planned Backload
    { wch: 20 }, // Backload Destination
    { wch: 18 }, // Backload Cargo Type
    { wch: 18 }, // Backload Offloading Date
    { wch: 25 }, // Backload Quantities
    { wch: 40 }, // Backload Notes
  ];
  worksheet["!cols"] = columnWidths;

  // Merge cells for the title row
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Create summary sheet
  // Count loads with planned backloads
  const loadsWithPlannedBackloads = loads.filter((l) => {
    const tw = timeWindowLib.parseTimeWindow(l.time_window);  // FIXED: Added timeWindowLib.
    return tw.backload?.enabled;
  }).length;

  const summaryData = [
    { Metric: "Total Loads", Value: loads.length },
    {
      Metric: "Scheduled",
      Value: loads.filter((l) => l.status === "scheduled").length,
    },
    {
      Metric: "In Transit",
      Value: loads.filter((l) => l.status === "in-transit").length,
    },
    {
      Metric: "Pending",
      Value: loads.filter((l) => l.status === "pending").length,
    },
    {
      Metric: "Delivered",
      Value: loads.filter((l) => l.status === "delivered").length,
    },
    { Metric: "", Value: "" },
    {
      Metric: "Total Quantity",
      Value: loads.reduce((sum, l) => sum + l.quantity, 0),
    },
    {
      Metric: "Total Weight (T)",
      Value: loads.reduce((sum, l) => sum + l.weight, 0),
    },
    { Metric: "", Value: "" },
    {
      Metric: "Primary Loads",
      Value: loads.filter((l) => !l.load_id.startsWith("BL-")).length,
    },
    {
      Metric: "Backloads (Scheduled)",
      Value: loads.filter((l) => l.load_id.startsWith("BL-")).length,
    },
    {
      Metric: "Loads with Planned Backload",
      Value: loadsWithPlannedBackloads,
    },
    { Metric: "", Value: "" },
    {
      Metric: "Report Generated",
      Value: format(new Date(), "dd/MM/yyyy HH:mm"),
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export loads for a specific week
export function exportWeeklyLoadsToExcel(
  loads: Load[],
  weekNumber: number,
  year: number,
  _weekStart: Date,
  _weekEnd: Date,
): void {
  exportLoadsToExcel(loads, {
    filename: `loads-week-${weekNumber}-${year}`,
    sheetName: `Week ${weekNumber}`,
  });
}

// Simplified export with fewer columns (excludes timing, status details, etc.)
export function exportLoadsToExcelSimplified(
  loads: Load[],
  options: ExportOptions = {},
): void {
  const weekNum = options.weekNumber ?? getWeek(new Date(), { weekStartsOn: 1 });
  const yr = options.year ?? new Date().getFullYear();
  const {
    filename = `loads-simplified-week-${weekNum}-${yr}`,
    sheetName = `Week ${weekNum}`,
  } = options;

  // Transform loads data for simplified Excel export
  const excelData = loads.map((load) => {
    const timeWindow = timeWindowLib.parseTimeWindow(load.time_window);  // FIXED: Added timeWindowLib.

    // Build backload quantities string
    let backloadQuantities = "";
    if (timeWindow.backload?.quantities) {
      const { bins, crates, pallets } = timeWindow.backload.quantities;
      const parts: string[] = [];
      if (bins > 0) parts.push(`${bins} bins`);
      if (crates > 0) parts.push(`${crates} crates`);
      if (pallets > 0) parts.push(`${pallets} pallets`);
      backloadQuantities = parts.join(", ");
    }

    return {
      "Load ID": load.load_id,
      Origin: load.origin,
      Destination: load.destination,
      "Cargo Type": cargoLabels[load.cargo_type] || load.cargo_type,
      "Loading Date": format(parseISO(load.loading_date), "dd/MM/yyyy"),
      "Offloading Date": format(parseISO(load.offloading_date), "dd/MM/yyyy"),
      Vehicle: load.fleet_vehicle?.vehicle_id || "",
      "Vehicle Type": load.fleet_vehicle?.type || "",
      Driver: load.driver?.name || "",
      "Backload Destination": timeWindow.backload?.destination || "",
      "Backload Cargo Type": timeWindow.backload?.cargoType
        ? cargoLabels[timeWindow.backload.cargoType] ||
          timeWindow.backload.cargoType
        : "",
      "Backload Offloading Date": timeWindow.backload?.offloadingDate || "",
      "Backload Quantities": backloadQuantities,
    };
  });

  // Week info for title
  const titleRow = [
    `Matanuska Local Planning - Week ${weekNum}, ${yr}`,
  ];

  // Create workbook and worksheet with title row
  const workbook = XLSX.utils.book_new();

  // Create worksheet with title at top
  const worksheet = XLSX.utils.aoa_to_sheet([titleRow, []]);

  // Add the data starting from row 3 (after title and blank row)
  XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A3" });

  // Set column widths for simplified version
  const columnWidths = [
    { wch: 15 }, // Load ID
    { wch: 20 }, // Origin
    { wch: 20 }, // Destination
    { wch: 18 }, // Cargo Type
    { wch: 12 }, // Loading Date
    { wch: 14 }, // Offloading Date
    { wch: 12 }, // Vehicle
    { wch: 12 }, // Vehicle Type
    { wch: 20 }, // Driver
    { wch: 20 }, // Backload Destination
    { wch: 18 }, // Backload Cargo Type
    { wch: 18 }, // Backload Offloading Date
    { wch: 25 }, // Backload Quantities
  ];
  worksheet["!cols"] = columnWidths;

  // Merge cells for the title row
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export simplified version for a specific week
export function exportWeeklyLoadsToExcelSimplified(
  loads: Load[],
  weekNumber: number,
  year: number,
): void {
  exportLoadsToExcelSimplified(loads, {
    filename: `loads-simplified-week-${weekNumber}-${year}`,
    sheetName: `Week ${weekNumber}`,
  });
}