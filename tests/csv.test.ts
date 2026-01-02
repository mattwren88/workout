import { describe, expect, it } from "vitest";
import { mapCsvRowsToRides, parseCsvText } from "@/lib/csv";

const sampleCsv = `start_time,duration,distance_m,elevation_m,activity_name\n2024-01-01T07:00:00Z,3600,25000,300,Morning Ride\n2024-01-02T07:30:00Z,1800,15000,200,Intervals`;

describe("csv parsing", () => {
  it("parses headers and rows", () => {
    const parsed = parseCsvText(sampleCsv);
    expect(parsed.headers).toContain("start_time");
    expect(parsed.rows.length).toBe(2);
  });

  it("maps csv rows to ride imports", () => {
    const parsed = parseCsvText(sampleCsv);
    const mapping = {
      date: "start_time",
      duration: "duration",
      distance: "distance_m",
      elevation: "elevation_m",
      name: "activity_name"
    };
    const rides = mapCsvRowsToRides(parsed.rows, mapping);
    expect(rides.length).toBe(2);
    expect(rides[0].distanceM).toBe(25000);
    expect(rides[0].durationSeconds).toBe(3600);
  });
});
