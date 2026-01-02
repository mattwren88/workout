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
import { buildStrengthTrends } from "@/lib/analytics";
import { kgToLb } from "@/lib/units";

const displayLift = (lift: string) =>
  ({
    squat: "Back Squat",
    bench: "Bench Press",
    row: "Barbell Row",
    deadlift: "Deadlift",
    ohp: "Overhead Press",
    split_squat: "Bulgarian Split Squat",
    hip_thrust: "Hip Thrust",
    pullups: "Pull-ups"
  }[lift] ?? lift);

type Session = {
  date: string;
  strengthEntries: {
    lift: string;
    sets: number;
    reps: number;
    weightKg: number;
  }[];
};

export default function StrengthDashboard() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [range, setRange] = useState<RangeOption>("90");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const now = new Date();
    const from = range === "custom" && customFrom ? new Date(customFrom) : subDays(now, Number(range === "custom" ? 90 : range));
    const to = range === "custom" && customTo ? new Date(customTo) : now;
    fetch(`/api/sessions?type=strength&from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []));
  }, [range, customFrom, customTo]);

  const entries = useMemo(() => {
    return sessions.flatMap((session) =>
      session.strengthEntries.map((entry) => ({
        lift: entry.lift,
        sets: entry.sets,
        reps: entry.reps,
        weightKg: entry.weightKg,
        sessionDate: session.date
      }))
    );
  }, [sessions]);

  const trends = useMemo(() => buildStrengthTrends(entries), [entries]);

  const multiplier = settings.units === "metric" ? 1 : kgToLb(1);

  const prs = useMemo(() => {
    const targetLifts = ["squat", "bench", "deadlift", "ohp"];
    const heaviest5RM: Record<string, number> = {};

    entries.forEach((entry) => {
      if (!targetLifts.includes(entry.lift) || entry.reps !== 5) return;
      const weight = entry.weightKg * multiplier;
      if (!heaviest5RM[entry.lift] || weight > heaviest5RM[entry.lift]) {
        heaviest5RM[entry.lift] = weight;
      }
    });

    return heaviest5RM;
  }, [entries, multiplier]);

  const volumePrs = useMemo(() => {
    const result: Record<string, number> = {};
    trends.forEach((trend) => {
      const best = trend.volume.reduce((max, entry) => Math.max(max, entry.value), 0);
      result[trend.lift] = best * multiplier;
    });
    return result;
  }, [trends, multiplier]);

  if (!entries.length) {
    return (
      <EmptyState
        title="No strength data yet"
        detail="Log Strength A/B sessions to see progress trends."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Strength progress</h2>
            <p className="text-sm text-slate-500">
              Tracking top set weight, Epley 1RM, and weekly volume.
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

      <div className="grid gap-6">
        {trends.map((trend) => (
          <div key={trend.lift} className="card p-6">
            <h3 className="section-title">{displayLift(trend.lift)}</h3>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="h-60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Top set</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.topSet.map((d) => ({
                    ...d,
                    value: d.value * multiplier
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" hide />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">1RM estimate</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.oneRM.map((d) => ({
                    ...d,
                    value: d.value * multiplier
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" hide />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 h-52">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly volume</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend.volume.map((d) => ({
                  ...d,
                  value: d.value * multiplier
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#b6f14e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="section-title">Personal records</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(prs).map(([lift, value]) => (
            <div key={lift} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{displayLift(lift)}</p>
              <p className="text-lg font-semibold text-slate-900">
                {value.toFixed(1)} {settings.units === "metric" ? "kg" : "lb"}
              </p>
              <p className="text-xs text-slate-500">Heaviest 5RM</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(volumePrs).map(([lift, value]) => (
            <div key={`${lift}-volume`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{displayLift(lift)}</p>
              <p className="text-lg font-semibold text-slate-900">
                {value.toFixed(0)} {settings.units === "metric" ? "kg" : "lb"}
              </p>
              <p className="text-xs text-slate-500">Weekly volume PR</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
