/**
 * Shared time_window JSON parsing utilities.
 *
 * Every file that used to define its own `parseTimeWindow` should import from here.
 */

import type {
  TimeWindowData,
  TimeWindowSection,
  BackloadInfo,
} from "@/types/load";

// Re-export the types so consumers don't need a second import
export type { TimeWindowData, TimeWindowSection, BackloadInfo };

// ---------------------------------------------------------------------------
// Extended data that can live inside a time_window JSON blob
// (third-party loads store extra info)
// ---------------------------------------------------------------------------

export interface ThirdPartyInfo {
  customerId?: string;
  cargoDescription?: string;
  linkedLoadNumber?: string;
  referenceNumber?: string;
}

export interface TimeWindowDataFull extends TimeWindowData {
  backload: BackloadInfo | null;  // Make it explicitly non-optional
  thirdParty?: ThirdPartyInfo | null;
}

// ---------------------------------------------------------------------------
// Core parser — returns a fully-defaulted TimeWindowDataFull
// ---------------------------------------------------------------------------

const emptySection: TimeWindowSection = {
  plannedArrival: "",
  plannedDeparture: "",
  actualArrival: "",
  actualDeparture: "",
};

function parseSection(
  raw: Record<string, unknown> | undefined | null,
): TimeWindowSection {
  if (!raw || typeof raw !== "object") return { ...emptySection };
  return {
    plannedArrival: (raw.plannedArrival as string) || "",
    plannedDeparture: (raw.plannedDeparture as string) || "",
    actualArrival: (raw.actualArrival as string) || "",
    actualDeparture: (raw.actualDeparture as string) || "",
    // Third-party loads store location info in time sections
    ...(raw.placeName ? { placeName: raw.placeName as string } : {}),
    ...(raw.address ? { address: raw.address as string } : {}),
  };
}

/**
 * Parse the `time_window` column into a typed object.
 *
 * Handles both TEXT (legacy string) and JSONB (parsed object) inputs.
 * - Always returns a valid object (never throws).
 * - Fields default to `""`.
 * - `backload` is `null` when absent.
 * - `thirdParty` is `null` when absent.
 */
export function parseTimeWindow(timeWindow: unknown): TimeWindowDataFull {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = typeof timeWindow === 'string'
      ? JSON.parse(timeWindow || "{}")
      : (timeWindow ?? {});
    
    return {
      origin: parseSection(data.origin),
      destination: parseSection(data.destination),
      backload: data.backload && typeof data.backload === 'object' 
        ? (data.backload as BackloadInfo) 
        : null,
      thirdParty: data.thirdParty || null,
    };
  } catch {
    return {
      origin: { ...emptySection },
      destination: { ...emptySection },
      backload: null,
      thirdParty: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience: form-friendly flat shape used by EditLoadDialog / CreateLoadDialog
// ---------------------------------------------------------------------------

export interface FormTimeDefaults {
  originPlannedArrival: string;
  originPlannedDeparture: string;
  destPlannedArrival: string;
  destPlannedDeparture: string;
  backload: BackloadInfo | null;
}

/**
 * Parse time_window into the flattened shape consumed by load form `defaultValues`.
 * Falls back to sensible default times when the stored values are empty.
 */
export function parseTimeWindowForForm(
  timeWindow: unknown,
  defaults = {
    originPlannedArrival: "15:00",
    originPlannedDeparture: "17:00",
    destPlannedArrival: "08:00",
    destPlannedDeparture: "11:00",
  },
): FormTimeDefaults {
  const tw = parseTimeWindow(timeWindow);
  return {
    originPlannedArrival: tw.origin.plannedArrival || defaults.originPlannedArrival,
    originPlannedDeparture: tw.origin.plannedDeparture || defaults.originPlannedDeparture,
    destPlannedArrival: tw.destination.plannedArrival || defaults.destPlannedArrival,
    destPlannedDeparture: tw.destination.plannedDeparture || defaults.destPlannedDeparture,
    backload: tw.backload,
  };
}

// ---------------------------------------------------------------------------
// Convenience: nullable variant for report / variance consumers that
// prefer to skip loads with unparseable data
// ---------------------------------------------------------------------------

/**
 * Like `parseTimeWindow` but returns `null` on parse failure instead of
 * an empty default object.
 */
export function parseTimeWindowOrNull(
  timeWindow: unknown,
): TimeWindowDataFull | null {
  if (!timeWindow) return null;
  try {
    if (typeof timeWindow === 'string') JSON.parse(timeWindow); // validate
    return parseTimeWindow(timeWindow);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SAST time helpers — shared by all variance / export logic.
// South Africa does not observe DST so UTC+2 is always correct.
// ---------------------------------------------------------------------------

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Convert any supported time string to total minutes from midnight **in SAST**.
 *
 * Supported formats:
 *  - "HH:mm"              — assumed SAST, parsed directly
 *  - "HH:mm:ss"           — assumed SAST, seconds stripped
 *  - ISO 8601 timestamp   — converted from UTC to SAST (UTC+2)
 *
 * Returns `null` if the value is empty, undefined, or unparseable.
 */
export function timeToSASTMinutes(time: string | undefined | null): number | null {
  if (!time) return null;

  // Plain HH:mm — assumed SAST
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);

  // HH:mm:ss — assumed SAST, drop seconds
  const hms = time.match(/^(\d{1,2}):(\d{2}):\d{2}/);
  if (hms) return parseInt(hms[1], 10) * 60 + parseInt(hms[2], 10);

  // ISO / any Date-parseable string → convert to SAST
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    const sast = new Date(d.getTime() + SAST_OFFSET_MS);
    return sast.getUTCHours() * 60 + sast.getUTCMinutes();
  }

  return null;
}

/**
 * Format any time value to "HH:mm" **in SAST**.
 *
 * - "HH:mm" input    → returned as-is (padded)
 * - "HH:mm:ss" input → seconds stripped
 * - ISO timestamp     → converted from UTC to SAST
 */
export function formatTimeAsSAST(ts: string | null | undefined): string {
  if (!ts) return "";
  // Plain HH:mm
  if (/^\d{1,2}:\d{2}$/.test(ts)) return ts.padStart(5, "0");
  // HH:mm:ss
  const hmsMatch = ts.match(/^(\d{1,2}):(\d{2}):\d{2}/);
  if (hmsMatch) return `${hmsMatch[1].padStart(2, "0")}:${hmsMatch[2]}`;
  // ISO / Date-parseable
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
    const sast = new Date(d.getTime() + SAST_OFFSET_MS);
    return `${String(sast.getUTCHours()).padStart(2, "0")}:${String(sast.getUTCMinutes()).padStart(2, "0")}`;
  }
  return ts;
}

/**
 * Compute variance between a planned time (HH:mm, SAST) and an actual time
 * (HH:mm, HH:mm:ss, or ISO timestamp) — both normalised to SAST.
 *
 * Positive diff → late, negative → early.
 */
export function computeTimeVariance(
  planned: string | undefined | null,
  actual: string | undefined | null,
): { label: string; diffMin: number | null; isLate: boolean } {
  const pMin = timeToSASTMinutes(planned);
  const aMin = timeToSASTMinutes(actual);
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

// ---------------------------------------------------------------------------
// Stringify helper
// ---------------------------------------------------------------------------

export function stringifyTimeWindow(data: TimeWindowData | TimeWindowDataFull): string {
  return JSON.stringify(data);
}