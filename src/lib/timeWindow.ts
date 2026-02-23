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
// Stringify helper
// ---------------------------------------------------------------------------

export function stringifyTimeWindow(data: TimeWindowData | TimeWindowDataFull): string {
  return JSON.stringify(data);
}