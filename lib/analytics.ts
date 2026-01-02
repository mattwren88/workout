import { format, isAfter, startOfWeek, subDays } from "date-fns";
import { epley1RM } from "@/lib/units";

export type StrengthEntry = {
  lift: string;
  sets: number;
  reps: number;
  weightKg: number;
  sessionDate: string;
};

export type RideEntry = {
  startTime?: string | null;
  durationSeconds: number;
  distanceM: number;
  elevationM?: number | null;
  avgSpeedMps?: number | null;
  effort?: "easy" | "moderate" | "hard" | null;
};

const weekKey = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return format(start, "yyyy-MM-dd");
};

export const buildStrengthTrends = (entries: StrengthEntry[]) => {
  const byLift = new Map<string, StrengthEntry[]>();
  entries.forEach((entry) => {
    if (!byLift.has(entry.lift)) byLift.set(entry.lift, []);
    byLift.get(entry.lift)?.push(entry);
  });

  const trends = Array.from(byLift.entries()).map(([lift, liftEntries]) => {
    const sorted = [...liftEntries].sort(
      (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );

    const topSet = sorted.map((entry) => ({
      date: entry.sessionDate,
      value: entry.weightKg
    }));

    const oneRM = sorted.map((entry) => ({
      date: entry.sessionDate,
      value: epley1RM(entry.weightKg, entry.reps)
    }));

    const volumeByWeek = new Map<string, number>();
    sorted.forEach((entry) => {
      const date = new Date(entry.sessionDate);
      const key = weekKey(date);
      const volume = entry.sets * entry.reps * entry.weightKg;
      volumeByWeek.set(key, (volumeByWeek.get(key) ?? 0) + volume);
    });

    const volume = Array.from(volumeByWeek.entries())
      .map(([week, value]) => ({ week, value }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    return {
      lift,
      topSet,
      oneRM,
      volume
    };
  });

  return trends;
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

export const inferRideEffort = (
  ride: RideEntry,
  speedThreshold: number
): "easy" | "moderate" | "hard" => {
  if (ride.effort) return ride.effort;
  const durationMinutes = ride.durationSeconds / 60;
  if (
    speedThreshold > 0 &&
    durationMinutes < 90 &&
    (ride.avgSpeedMps ?? 0) >= speedThreshold
  ) {
    return "hard";
  }
  return "easy";
};

export const buildRideWeeklyStats = (rides: RideEntry[]) => {
  const cutoff = subDays(new Date(), 60);
  const recentSpeeds = rides
    .filter((ride) => ride.startTime)
    .filter((ride) => isAfter(new Date(ride.startTime ?? ""), cutoff))
    .map((ride) => ride.avgSpeedMps ?? 0)
    .filter((speed) => speed > 0);

  const speedThreshold = percentile(recentSpeeds, 0.8);

  const byWeek = new Map<
    string,
    {
      week: string;
      durationSeconds: number;
      distanceM: number;
      elevationM: number;
      hardRides: number;
      rides: number;
      longestRide: number;
    }
  >();

  rides.forEach((ride) => {
    const date = new Date(ride.startTime ?? new Date().toISOString());
    const key = weekKey(date);
    const effort = inferRideEffort(ride, speedThreshold);
    const entry = byWeek.get(key) ?? {
      week: key,
      durationSeconds: 0,
      distanceM: 0,
      elevationM: 0,
      hardRides: 0,
      rides: 0,
      longestRide: 0
    };
    entry.durationSeconds += ride.durationSeconds;
    entry.distanceM += ride.distanceM;
    entry.elevationM += ride.elevationM ?? 0;
    entry.rides += 1;
    entry.longestRide = Math.max(entry.longestRide, ride.durationSeconds);
    if (effort === "hard") entry.hardRides += 1;
    byWeek.set(key, entry);
  });

  const weeks = Array.from(byWeek.values()).sort(
    (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
  );

  return { weeks, speedThreshold };
};
