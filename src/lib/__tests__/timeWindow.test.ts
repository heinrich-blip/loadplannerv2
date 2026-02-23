import { describe, it, expect } from "vitest";
import {
  parseTimeWindow,
  parseTimeWindowForForm,
  parseTimeWindowOrNull,
  stringifyTimeWindow,
} from "@/lib/timeWindow";

describe("parseTimeWindow", () => {
  it("returns defaults for null/undefined/empty input", () => {
    for (const input of [null, undefined, "", "  "]) {
      const result = parseTimeWindow(input as string | null | undefined);
      expect(result.origin.plannedArrival).toBe("");
      expect(result.destination.plannedArrival).toBe("");
      expect(result.backload).toBeNull();
      expect(result.thirdParty).toBeNull();
    }
  });

  it("parses complete time window JSON correctly (including full backload)", () => {
    const json = JSON.stringify({
      origin: { plannedArrival: "15:00", plannedDeparture: "17:00" },
      destination: { plannedArrival: "08:00", plannedDeparture: "11:00" },
      backload: {
        enabled: true,
        destination: "BV",
        cargoType: "Packaging",
        offloadingDate: "2026-01-15",
        notes: "test notes",
        quantities: { bins: 20, crates: 5, pallets: 10 },
      },
    });

    const result = parseTimeWindow(json);

    expect(result.origin.plannedArrival).toBe("15:00");
    expect(result.origin.plannedDeparture).toBe("17:00");
    expect(result.destination.plannedArrival).toBe("08:00");
    expect(result.destination.plannedDeparture).toBe("11:00");
    expect(result.backload).toEqual({
      enabled: true,
      destination: "BV",
      cargoType: "Packaging",
      offloadingDate: "2026-01-15",
      notes: "test notes",
      quantities: { bins: 20, crates: 5, pallets: 10 },
    });
  });

  it("handles backload with minimal required fields (quantities omitted)", () => {
    const json = JSON.stringify({
      origin: {},
      destination: {},
      backload: {
        enabled: true,
        destination: "CBC",
        cargoType: "Fertilizer",
        offloadingDate: "2026-02-01",
      },
    });

    const result = parseTimeWindow(json);

    expect(result.backload).toEqual({
      enabled: true,
      destination: "CBC",
      cargoType: "Fertilizer",
      offloadingDate: "2026-02-01",
    });
  });

  it("preserves backload even if enabled is false (filtering is done by parseBackloadInfo)", () => {
    const json = JSON.stringify({
      origin: {},
      destination: {},
      backload: {
        enabled: false,
        destination: "BV",
        cargoType: "Packaging",
        offloadingDate: "2026-01-01",
        notes: "should be ignored",
        quantities: { bins: 99, crates: 99, pallets: 99 },
      },
    });

    const result = parseTimeWindow(json);

    // parseTimeWindow preserves backload data as-is; parseBackloadInfo checks enabled
    expect(result.backload).toEqual({
      enabled: false,
      destination: "BV",
      cargoType: "Packaging",
      offloadingDate: "2026-01-01",
      notes: "should be ignored",
      quantities: { bins: 99, crates: 99, pallets: 99 },
    });
  });

  it("parses third-party info when present", () => {
    const json = JSON.stringify({
      origin: { plannedArrival: "12:00", placeName: "Farm A", address: "123 Road" },
      destination: {},
      thirdParty: { customerId: "abc", referenceNumber: "REF-001" },
    });

    const result = parseTimeWindow(json);

    expect(result.origin.placeName).toBe("Farm A");
    expect(result.origin.address).toBe("123 Road");
    expect(result.thirdParty?.customerId).toBe("abc");
    expect(result.thirdParty?.referenceNumber).toBe("REF-001");
  });

  it("returns defaults for invalid JSON", () => {
    const result = parseTimeWindow("{invalid json");
    expect(result.origin.plannedArrival).toBe("");
    expect(result.backload).toBeNull();
  });

  it("accepts a pre-parsed JSONB object (not a string)", () => {
    const obj = {
      origin: { plannedArrival: "10:00", plannedDeparture: "12:00" },
      destination: { plannedArrival: "18:00", plannedDeparture: "20:00" },
      backload: {
        enabled: true,
        destination: "BV",
        cargoType: "Packaging",
        offloadingDate: "2026-03-01",
        quantities: { bins: 5, crates: 0, pallets: 15 },
      },
    };
    const result = parseTimeWindow(obj as unknown as Record<string, unknown>);

    expect(result.origin.plannedArrival).toBe("10:00");
    expect(result.destination.plannedArrival).toBe("18:00");
    expect(result.backload?.destination).toBe("BV");
    expect(result.backload?.quantities).toEqual({ bins: 5, crates: 0, pallets: 15 });
  });
});

describe("parseTimeWindowForForm", () => {
  it("returns default times when stored values are empty", () => {
    const result = parseTimeWindowForForm(null);
    expect(result.originPlannedArrival).toBe("15:00");
    expect(result.originPlannedDeparture).toBe("17:00");
    expect(result.destPlannedArrival).toBe("08:00");
    expect(result.destPlannedDeparture).toBe("11:00");
    expect(result.backload).toBeNull();
  });

  it("uses stored values when present", () => {
    const json = JSON.stringify({
      origin: { plannedArrival: "06:00", plannedDeparture: "07:00" },
      destination: { plannedArrival: "14:00", plannedDeparture: "16:00" },
    });

    const result = parseTimeWindowForForm(json);
    expect(result.originPlannedArrival).toBe("06:00");
    expect(result.originPlannedDeparture).toBe("07:00");
    expect(result.destPlannedArrival).toBe("14:00");
    expect(result.destPlannedDeparture).toBe("16:00");
  });

  it("uses custom defaults when provided", () => {
    const result = parseTimeWindowForForm(null, {
      originPlannedArrival: "10:00",
      originPlannedDeparture: "12:00",
      destPlannedArrival: "18:00",
      destPlannedDeparture: "20:00",
    });
    expect(result.originPlannedArrival).toBe("10:00");
    expect(result.destPlannedDeparture).toBe("20:00");
  });
});

describe("parseTimeWindowOrNull", () => {
  it("returns null for null/undefined/empty", () => {
    expect(parseTimeWindowOrNull(null)).toBeNull();
    expect(parseTimeWindowOrNull(undefined)).toBeNull();
    expect(parseTimeWindowOrNull("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseTimeWindowOrNull("not json")).toBeNull();
  });

  it("returns parsed data for valid JSON", () => {
    const json = JSON.stringify({
      origin: { plannedArrival: "09:00" },
      destination: {},
    });
    const result = parseTimeWindowOrNull(json);
    expect(result).not.toBeNull();
    expect(result!.origin.plannedArrival).toBe("09:00");
  });
});

describe("stringifyTimeWindow", () => {
  it("round-trips through parse and stringify (full backload with quantities)", () => {
    const original = {
      origin: { plannedArrival: "15:00", plannedDeparture: "17:00", actualArrival: "", actualDeparture: "" },
      destination: { plannedArrival: "08:00", plannedDeparture: "11:00", actualArrival: "", actualDeparture: "" },
      backload: {
        enabled: true,
        destination: "CBC",
        cargoType: "Fertilizer",
        offloadingDate: "2026-01-20",
        notes: "Round-trip test",
        quantities: { bins: 30, crates: 15, pallets: 8 },
      },
    };

    const json = stringifyTimeWindow(original);
    const parsed = parseTimeWindow(json);

    expect(parsed.origin.plannedArrival).toBe("15:00");
    expect(parsed.destination.plannedDeparture).toBe("11:00");
    expect(parsed.backload).toEqual({
      enabled: true,
      destination: "CBC",
      cargoType: "Fertilizer",
      offloadingDate: "2026-01-20",
      notes: "Round-trip test",
      quantities: { bins: 30, crates: 15, pallets: 8 },
    });
  });

  it("round-trips with backload disabled (preserves data as-is)", () => {
    const original = {
      origin: { plannedArrival: "10:00", plannedDeparture: "12:00", actualArrival: "", actualDeparture: "" },
      destination: { plannedArrival: "18:00", plannedDeparture: "20:00", actualArrival: "", actualDeparture: "" },
      backload: {
        enabled: false,
        destination: "Ignored",
        cargoType: "Ignored",
        offloadingDate: "1970-01-01",
        notes: "ignored",
        quantities: { bins: 99, crates: 99, pallets: 99 },
      },
    };

    const json = stringifyTimeWindow(original);
    const parsed = parseTimeWindow(json);

    // parseTimeWindow preserves all data; it doesn't filter by enabled
    expect(parsed.backload).toEqual(original.backload);
  });
});