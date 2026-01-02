"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { useSettings } from "@/components/SettingsProvider";
import { weekDays, startOfWeekMonday, endOfWeekMonday } from "@/lib/date";
import { buildRideWeeklyStats, inferRideEffort } from "@/lib/analytics";
import { formatDuration } from "@/lib/units";

const dayLabel = (date: Date) => format(date, "EEE");
const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

export default function PlanPage() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<any[]>([]);
  const [rideHistory, setRideHistory] = useState<any[]>([]);

  useEffect(() => {
    const start = startOfWeekMonday(new Date());
    const end = endOfWeekMonday(new Date());
    fetch(`/api/sessions?from=${start.toISOString()}&to=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []));

    const historyStart = subDays(new Date(), 60);
    fetch(`/api/sessions?type=ride&from=${historyStart.toISOString()}`)
      .then((res) => res.json())
      .then((data) => setRideHistory(data.sessions ?? []));
  }, []);

  const days = useMemo(() => weekDays(new Date()), []);

  const planned = useMemo(() => {
    const plan = new Map<string, string[]>();
    days.forEach((day) => {
      const weekday = day.getDay();
      const labels: string[] = [];
      if (weekday === settings.strengthDays.A) labels.push("Strength A");
      if (weekday === settings.strengthDays.B) labels.push("Strength B");
      if (settings.kbDays.includes(weekday)) labels.push("Kettlebell");
      plan.set(dateKey(day), labels);
    });

    const rideLabels = days.map((day) => ({
      key: dateKey(day),
      index: day.getDay()
    }));

    const longRideDay = settings.rideTargets.longRideDay;
    const longRideSlot = rideLabels.find((day) => day.index === longRideDay);
    if (longRideSlot) {
      plan.get(longRideSlot.key)?.push("Long Ride");
    }

    const additionalRides = Math.max(settings.rideTargets.minRides - 1, 0);
    const candidateDays = rideLabels.filter(
      (day) => day.index !== longRideDay
    );

    let added = 0;
    for (const candidate of candidateDays) {
      if (added >= additionalRides) break;
      plan.get(candidate.key)?.push("Ride");
      added += 1;
    }

    return plan;
  }, [days, settings.kbDays, settings.rideTargets.longRideDay, settings.rideTargets.minRides, settings.strengthDays.A, settings.strengthDays.B]);

  const completedByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    sessions.forEach((session) => {
      const key = session.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(session.title ?? session.type);
      map.set(key, list);
    });
    return map;
  }, [sessions]);

  const compliance = useMemo(() => {
    const strengthCount = sessions.filter((s) => s.type === "strength").length;
    const kbCount = sessions.filter((s) => s.type === "kettlebell").length;
    const rides = sessions
      .filter((s) => s.type === "ride")
      .map((s) => s.rideEntry)
      .filter(Boolean);

    const historyRides = rideHistory
      .filter((s) => s.rideEntry)
      .map((s) => s.rideEntry);

    const { speedThreshold } = buildRideWeeklyStats(
      historyRides.map((ride: any) => ({
        startTime: ride.startTime,
        durationSeconds: ride.durationSeconds,
        distanceM: ride.distanceM,
        elevationM: ride.elevationM,
        avgSpeedMps: ride.avgSpeedMps,
        effort: ride.effort
      }))
    );

    const hardRides = rides.filter((ride: any) =>
      inferRideEffort(ride, speedThreshold) === "hard"
    ).length;

    const rideCount = rides.length;
    const rideSeconds = rides.reduce((sum: number, ride: any) => sum + ride.durationSeconds, 0);

    const metStrength = strengthCount >= 2;
    const metKb = kbCount >= 1;
    const metRides = rideCount >= settings.rideTargets.minRides;
    const metHours = rideSeconds / 3600 >= settings.rideTargets.weeklyHours;
    const withinHardCap = hardRides <= settings.rideTargets.maxHardRides;

    const score = [metStrength, metKb, metRides, metHours, withinHardCap].filter(Boolean).length;

    const status = score >= 4 ? "green" : score >= 2 ? "yellow" : "red";

    return {
      strengthCount,
      kbCount,
      rideCount,
      rideSeconds,
      hardRides,
      status
    };
  }, [sessions, rideHistory, settings.rideTargets]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Week plan</p>
            <h2 className="section-title">Mon - Sun rhythm</h2>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              compliance.status === "green"
                ? "bg-green-100 text-green-700"
                : compliance.status === "yellow"
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            Compliance {compliance.status}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Strength: {compliance.strengthCount}/2</span>
          <span>KB: {compliance.kbCount}/1</span>
          <span>Rides: {compliance.rideCount}/{settings.rideTargets.minRides}</span>
          <span>Ride volume: {formatDuration(compliance.rideSeconds)}</span>
          <span>Hard rides: {compliance.hardRides}/{settings.rideTargets.maxHardRides}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const plannedItems = planned.get(key) ?? [];
          const completedItems = completedByDay.get(key) ?? [];
          return (
            <div key={key} className="card-ghost p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{dayLabel(day)}</p>
              <p className="text-sm font-semibold text-slate-900">{format(day, "MMM d")}</p>
              <div className="mt-3 space-y-2">
                {plannedItems.length ? (
                  plannedItems.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No planned sessions</p>
                )}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Completed</p>
                {completedItems.length ? (
                  completedItems.map((item, index) => (
                    <div key={`${item}-${index}`} className="mt-2 rounded-xl bg-lime-100 px-3 py-2 text-xs text-emerald-700">
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Nothing logged</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h3 className="section-title">Weekly targets</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly hours</p>
            <p className="text-lg font-semibold text-slate-900">{settings.rideTargets.weeklyHours}h</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Min rides</p>
            <p className="text-lg font-semibold text-slate-900">{settings.rideTargets.minRides}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hard ride cap</p>
            <p className="text-lg font-semibold text-slate-900">{settings.rideTargets.maxHardRides}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
