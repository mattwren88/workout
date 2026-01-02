import { describe, expect, it } from "vitest";
import {
  distanceToMeters,
  elevationToMeters,
  formatDistance,
  formatSpeed,
  formatWeight,
  metersToMiles,
  parseDurationToSeconds,
  secondsToClock,
  speedToMps,
  toKg
} from "@/lib/units";

describe("unit conversions", () => {
  it("converts meters to miles", () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
  });

  it("formats distance based on units", () => {
    expect(formatDistance(1000, "metric")).toContain("1");
    expect(formatDistance(1609.344, "imperial")).toContain("1");
  });

  it("parses duration strings", () => {
    expect(parseDurationToSeconds("01:30:00")).toBe(5400);
    expect(parseDurationToSeconds("90")).toBe(90);
    expect(parseDurationToSeconds("3600.5")).toBe(3601);
  });

  it("converts display distances to meters", () => {
    expect(distanceToMeters(1, "metric")).toBe(1000);
    expect(distanceToMeters(1, "imperial")).toBeCloseTo(1609.344, 3);
  });

  it("converts display elevation to meters", () => {
    expect(elevationToMeters(100, "metric")).toBe(100);
    expect(elevationToMeters(328.084, "imperial")).toBeCloseTo(100, 1);
  });

  it("converts speed to m/s", () => {
    expect(speedToMps(36, "metric")).toBeCloseTo(10, 3);
    expect(speedToMps(22.36936, "imperial")).toBeCloseTo(10, 3);
  });

  it("formats speed and weight", () => {
    expect(formatSpeed(10, "metric")).toContain("km/h");
    expect(formatWeight(100, "imperial")).toContain("lb");
  });

  it("converts pounds to kg", () => {
    expect(toKg(220.462, "imperial")).toBeCloseTo(100, 1);
  });

  it("formats seconds to clock", () => {
    expect(secondsToClock(65)).toBe("00:01:05");
  });
});
