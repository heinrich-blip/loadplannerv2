import { utils as XLSXUtils, writeFile as XLSXWriteFile, type WorkBook } from "xlsx";
import type { Load } from "@/hooks/useLoads";
import * as timeWindowLib from "@/lib/timeWindow";
import { timeToSASTMinutes } from "@/lib/timeWindow";
import { parseISO, format } from "date-fns";

/** Compute variance in minutes using SAST-aware conversion */
function minutesVariance(planned?: string, actual?: string): number | null {
  const pMin = timeToSASTMinutes(planned);
  const aMin = timeToSASTMinutes(actual);
  if (pMin === null || aMin === null) return null;
  return aMin - pMin;
}

export function exportPunctualityToExcel(loads: Load[], timeRange: "3months" | "6months" | "12months") {
  // Details sheet: per-load planned vs actual and variances
  const detailsRows = loads.map((l) => {
    const t = timeWindowLib.parseTimeWindowOrNull(l.time_window);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: Record<string, any> = {
      LoadID: l.load_id,
      Vehicle: l.fleet_vehicle?.vehicle_id || "",
      Origin: l.origin,
      Destination: l.destination,
      LoadingDate: format(parseISO(l.loading_date), "yyyy-MM-dd"),
      OffloadingDate: format(parseISO(l.offloading_date), "yyyy-MM-dd"),
      Status: l.status,
    };
    if (t) {
      row["Origin Planned Arr"] = t.origin.plannedArrival || "";
      row["Origin Actual Arr"] = t.origin.actualArrival || "";
      row["Origin Var Arr (min)"] = minutesVariance(t.origin.plannedArrival, t.origin.actualArrival);
      row["Origin Planned Dep"] = t.origin.plannedDeparture || "";
      row["Origin Actual Dep"] = t.origin.actualDeparture || "";
      row["Origin Var Dep (min)"] = minutesVariance(t.origin.plannedDeparture, t.origin.actualDeparture);
      row["Dest Planned Arr"] = t.destination.plannedArrival || "";
      row["Dest Actual Arr"] = t.destination.actualArrival || "";
      row["Dest Var Arr (min)"] = minutesVariance(t.destination.plannedArrival, t.destination.actualArrival);
      row["Dest Planned Dep"] = t.destination.plannedDeparture || "";
      row["Dest Actual Dep"] = t.destination.actualDeparture || "";
      row["Dest Var Dep (min)"] = minutesVariance(t.destination.plannedDeparture, t.destination.actualDeparture);
    }
    return row;
  });

  const wb: WorkBook = XLSXUtils.book_new();
  const detailsWs = XLSXUtils.json_to_sheet(detailsRows);
  XLSXUtils.book_append_sheet(wb, detailsWs, "Details");

  // Save
  const nowLabel = format(new Date(), "yyyyMMdd-HHmm");
  XLSXWriteFile(wb, `Punctuality-${timeRange}-${nowLabel}.xlsx`);
}