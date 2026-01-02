import Papa from "papaparse";
import { parseDurationToSeconds } from "@/lib/units";

export type CsvRow = Record<string, string>;

export type CsvMapping = {
  date: string;
  duration: string;
  distance: string;
  elevation?: string;
  name?: string;
  avgSpeed?: string;
  effort?: string;
};

export type RideImport = {
  startTime: string;
  durationSeconds: number;
  distanceM: number;
  elevationM: number | null;
  avgSpeedMps: number | null;
  activityName: string | null;
  effort: "easy" | "moderate" | "hard" | null;
};

const parseNumber = (value: string | undefined) => {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const parseCsvText = (text: string) => {
  const result = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true
  });
  return {
    rows: result.data,
    headers: result.meta.fields ?? [],
    errors: result.errors
  };
};

const parseDateValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const parseEffort = (value: string | undefined) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("hard")) return "hard";
  if (normalized.includes("easy")) return "easy";
  if (normalized.includes("mod")) return "moderate";
  return null;
};

export const mapCsvRowsToRides = (rows: CsvRow[], mapping: CsvMapping) => {
  return rows
    .map((row) => {
      const startTime = parseDateValue(row[mapping.date]);
      if (!startTime) return null;
      const durationRaw = row[mapping.duration] ?? "";
      const durationSeconds = parseDurationToSeconds(durationRaw);
      const distanceM = parseNumber(row[mapping.distance]);
      if (!durationSeconds || !distanceM) return null;
      const elevationM = mapping.elevation ? parseNumber(row[mapping.elevation]) : 0;
      const avgSpeedMps = mapping.avgSpeed ? parseNumber(row[mapping.avgSpeed]) : 0;
      return {
        startTime,
        durationSeconds,
        distanceM,
        elevationM: elevationM > 0 ? elevationM : null,
        avgSpeedMps: avgSpeedMps > 0 ? avgSpeedMps : null,
        activityName: mapping.name ? row[mapping.name] || null : null,
        effort: parseEffort(mapping.effort ? row[mapping.effort] : undefined)
      } as RideImport;
    })
    .filter((ride): ride is RideImport => Boolean(ride));
};
