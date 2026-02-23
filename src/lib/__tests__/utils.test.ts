import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatLastConnected } from "@/lib/utils";
import { getLocationDisplayName } from "@/lib/utils";

describe("formatLastConnected", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Never" for null/undefined/empty', () => {
    expect(formatLastConnected(null)).toBe("Never");
    expect(formatLastConnected(undefined)).toBe("Never");
    expect(formatLastConnected("")).toBe("Never");
  });

  it('returns "Just now" for times less than 1 minute ago', () => {
    expect(formatLastConnected("2025-06-15T11:59:30Z")).toBe("Just now");
  });

  it("returns minutes for times less than 1 hour ago", () => {
    expect(formatLastConnected("2025-06-15T11:45:00Z")).toBe("15m ago");
    expect(formatLastConnected("2025-06-15T11:01:00Z")).toBe("59m ago");
  });

  it("returns hours for times less than 24 hours ago", () => {
    expect(formatLastConnected("2025-06-15T10:00:00Z")).toBe("2h ago");
    expect(formatLastConnected("2025-06-14T13:00:00Z")).toBe("23h ago");
  });

  it("returns days for times 24+ hours ago", () => {
    expect(formatLastConnected("2025-06-14T12:00:00Z")).toBe("1d ago");
    expect(formatLastConnected("2025-06-10T12:00:00Z")).toBe("5d ago");
  });
});

describe("getLocationDisplayName", () => {
  it("returns empty string for null/undefined", () => {
    expect(getLocationDisplayName(null)).toBe("");
    expect(getLocationDisplayName(undefined)).toBe("");
  });

  it("returns the string for string locations", () => {
    expect(getLocationDisplayName("Bulawayo Depot")).toBe("Bulawayo Depot");
  });

  it("returns placeName for object locations", () => {
    expect(getLocationDisplayName({ placeName: "Farm A" })).toBe("Farm A");
  });

  it("returns empty string for objects without placeName", () => {
    expect(getLocationDisplayName({})).toBe("");
  });
});