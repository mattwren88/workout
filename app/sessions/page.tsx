"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subDays } from "date-fns";
import { RangeFilter, RangeOption } from "@/components/RangeFilter";
import { EmptyState } from "@/components/EmptyState";
import { formatDistance, formatDuration } from "@/lib/units";
import { useSettings } from "@/components/SettingsProvider";

type Session = {
  id: string;
  date: string;
  type: "strength" | "kettlebell" | "ride";
  title: string | null;
  durationSeconds: number | null;
  rideEntry?: {
    distanceM: number;
  } | null;
};

const buildRange = (option: RangeOption) => {
  const now = new Date();
  if (option === "custom") {
    return { from: subDays(now, 30), to: now };
  }
  return { from: subDays(now, Number(option)), to: now };
};

export default function SessionsPage() {
  const { settings } = useSettings();
  const [range, setRange] = useState<RangeOption>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const { from, to } = buildRange(range);
    const fromDate = range === "custom" && customFrom ? new Date(customFrom) : from;
    const toDate = range === "custom" && customTo ? new Date(customTo) : to;

    fetch(`/api/sessions?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []));
  }, [range, customFrom, customTo]);

  const totals = useMemo(() => {
    const rideSeconds = sessions.reduce(
      (sum, session) => sum + (session.durationSeconds ?? 0),
      0
    );
    const rideDistance = sessions.reduce(
      (sum, session) => sum + (session.rideEntry?.distanceM ?? 0),
      0
    );
    return { rideSeconds, rideDistance };
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Filters</p>
            <h2 className="section-title">Session history</h2>
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
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Total rides: {formatDuration(totals.rideSeconds)}</span>
          <span>Distance: {formatDistance(totals.rideDistance, settings.units)}</span>
        </div>
      </div>

      {sessions.length ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session.title ?? session.type}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(session.date).toLocaleDateString()} | {session.type}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link className="button-secondary" href={`/sessions/${session.id}`}>
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No sessions yet"
          detail="Log a workout or import rides to see them here."
        />
      )}
    </div>
  );
}
