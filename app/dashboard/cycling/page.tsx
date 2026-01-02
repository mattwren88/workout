"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useSettings } from "@/components/SettingsProvider";
import { EmptyState } from "@/components/EmptyState";
import { RangeFilter, RangeOption } from "@/components/RangeFilter";
import { buildRideWeeklyStats, inferRideEffort } from "@/lib/analytics";
import { formatDistance, formatDuration, formatElevation } from "@/lib/units";

type RideSession = {
  date: string;
  durationSeconds: number | null;
  rideEntry?: {
    startTime: string | null;
    durationSeconds: number;
    distanceM: number;
    elevationM: number | null;
    avgSpeedMps: number | null;
    effort: "easy" | "moderate" | "hard" | null;
  } | null;
};

export default function CyclingDashboard() {
  const { settings } = useSettings();
  const [allSessions, setAllSessions] = useState<RideSession[]>([]);
  const [range, setRange] = useState<RangeOption>("90");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    fetch("/api/sessions?type=ride")
      .then((res) => res.json())
      .then((data) => setAllSessions(data.sessions ?? []));
  }, []);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const from =
      range === "custom" && customFrom
        ? new Date(customFrom)
        : subDays(now, Number(range === "custom" ? 90 : range));
    const to = range === "custom" && customTo ? new Date(customTo) : now;
    return allSessions.filter((session) => {
      const date = new Date(session.date);
      return date >= from && date <= to;
    });
  }, [allSessions, range, customFrom, customTo]);

  const rides = useMemo(() => {
    return filteredSessions
      .filter((session) => session.rideEntry)
      .map((session) => ({
        startTime: session.rideEntry?.startTime ?? session.date,
        durationSeconds: session.rideEntry?.durationSeconds ?? 0,
        distanceM: session.rideEntry?.distanceM ?? 0,
        elevationM: session.rideEntry?.elevationM ?? 0,
        avgSpeedMps: session.rideEntry?.avgSpeedMps ?? 0,
        effort: session.rideEntry?.effort ?? null
      }));
  }, [filteredSessions]);

  const { weeks } = useMemo(() => buildRideWeeklyStats(rides), [rides]);

  const last60Rides = useMemo(() => {
    const cutoff = subDays(new Date(), 60);
    return allSessions
      .filter((session) => new Date(session.date) >= cutoff)
      .filter((session) => session.rideEntry)
      .map((session) => ({
        startTime: session.rideEntry?.startTime ?? session.date,
        durationSeconds: session.rideEntry?.durationSeconds ?? 0,
        distanceM: session.rideEntry?.distanceM ?? 0,
        elevationM: session.rideEntry?.elevationM ?? 0,
        avgSpeedMps: session.rideEntry?.avgSpeedMps ?? 0,
        effort: session.rideEntry?.effort ?? null
      }));
  }, [allSessions]);

  const speedThreshold = useMemo(
    () => buildRideWeeklyStats(last60Rides).speedThreshold,
    [last60Rides]
  );

  const latestWeek = weeks.at(-1);

  const intensityCounts = useMemo(() => {
    return rides.reduce(
      (acc, ride) => {
        const effort = inferRideEffort(ride, speedThreshold);
        acc[effort] += 1;
        return acc;
      },
      { easy: 0, moderate: 0, hard: 0 }
    );
  }, [rides, speedThreshold]);

  if (!rides.length) {
    return (
      <EmptyState
        title="No ride data yet"
        detail="Import your CSV or log a ride to see cycling trends."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Cycling load</h2>
            <p className="text-sm text-slate-500">
              Weekly distance, elevation, and hard ride count (auto-inferred if missing).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RangeFilter value={range} onChange={setRange} />
            {range === "custom" ? (
              <div className="flex flex-wrap gap-2">
                <input
                  className="input"
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
                <input
                  className="input"
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {latestWeek ? (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly hours</p>
            <p className="font-heading text-2xl font-semibold">
              {formatDuration(latestWeek.durationSeconds)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly distance</p>
            <p className="font-heading text-2xl font-semibold">
              {formatDistance(latestWeek.distanceM, settings.units)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly elevation</p>
            <p className="font-heading text-2xl font-semibold">
              {formatElevation(latestWeek.elevationM, settings.units)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hard rides</p>
            <p className="font-heading text-2xl font-semibold">{latestWeek.hardRides}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Longest ride</p>
            <p className="font-heading text-2xl font-semibold">
              {formatDuration(latestWeek.longestRide)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="section-title">Weekly hours</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks.map((week) => ({
                ...week,
                hours: week.durationSeconds / 3600
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#0f172a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="section-title">Weekly distance</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeks.map((week) => ({
                  ...week,
                  distance:
                    settings.units === "metric"
                      ? week.distanceM / 1000
                      : week.distanceM / 1609.344
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="distance" fill="#b6f14e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title">Intensity distribution</h3>
        <p className="text-sm text-slate-500">
          Hard rides inferred when duration &lt; 90 min and avg speed is in the top 20% of the last 60 days.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
          <span>Easy: {intensityCounts.easy}</span>
          <span>Moderate: {intensityCounts.moderate}</span>
          <span>Hard: {intensityCounts.hard}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rides.slice(0, 6).map((ride, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs text-slate-500">{new Date(ride.startTime ?? "").toLocaleDateString()}</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatDistance(ride.distanceM, settings.units)} | {formatDuration(ride.durationSeconds)}
              </p>
              <p className="text-xs text-slate-500">
                Effort: {inferRideEffort(ride, speedThreshold)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
