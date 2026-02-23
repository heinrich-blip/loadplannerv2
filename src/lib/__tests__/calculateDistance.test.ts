import { describe, it, expect } from "vitest";
import { calculateDistance } from "@/lib/depots";

describe("calculateDistance (Haversine)", () => {
  it("returns 0 for the same point", () => {
    const dist = calculateDistance(-20.15, 28.57, -20.15, 28.57);
    expect(dist).toBe(0);
  });

  it("calculates known distance Bulawayo → Harare (~440 km)", () => {
    // Bulawayo Depot approx -20.147, 28.570
    // Rezende Depot (Harare) approx -17.840, 31.046
    const dist = calculateDistance(-20.147, 28.570, -17.840, 31.046);
    // Should be roughly 350-450 km (straight line)
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(500);
  });

  it("calculates a short distance correctly", () => {
    // Two points ~1.11 km apart (0.01 degree latitude at equator ≈ 1.11 km)
    const dist = calculateDistance(0, 0, 0.01, 0);
    expect(dist).toBeCloseTo(1.11, 1);
  });

  it("is symmetric", () => {
    const d1 = calculateDistance(-20, 28, -17, 31);
    const d2 = calculateDistance(-17, 31, -20, 28);
    expect(d1).toBeCloseTo(d2, 6);
  });
});