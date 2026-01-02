"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { startOfWeek } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/components/SettingsProvider";
import { formatDistance, formatDuration } from "@/lib/units";

type Session = {
  id: string;
  date: string;
  type: "strength" | "kettlebell" | "ride";
  title: string | null;
  durationSeconds: number | null;
  rideEntry?: {
    distanceM: number;
    elevationM: number | null;
  } | null;
};

export default function HomePage() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    fetch(`/api/sessions?from=${weekStart.toISOString()}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []));
  }, []);

  const stats = useMemo(() => {
    const strengthSessions = sessions.filter((s) => s.type === "strength");
    const kbSessions = sessions.filter((s) => s.type === "kettlebell");
    const rideSessions = sessions.filter((s) => s.type === "ride");

    const rideDistance = rideSessions.reduce(
      (sum, session) => sum + (session.rideEntry?.distanceM ?? 0),
      0
    );

    const rideSeconds = rideSessions.reduce(
      (sum, session) => sum + (session.durationSeconds ?? 0),
      0
    );

    return {
      strengthCount: strengthSessions.length,
      kbCount: kbSessions.length,
      rideCount: rideSessions.length,
      rideDistance,
      rideSeconds
    };
  }, [sessions]);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Strength sessions" value={String(stats.strengthCount)} />
        <StatCard label="KB sessions" value={String(stats.kbCount)} />
        <StatCard label="Rides" value={String(stats.rideCount)} />
        <StatCard
          label="Ride volume"
          value={`${formatDuration(stats.rideSeconds)} | ${formatDistance(
            stats.rideDistance,
            settings.units
          )}`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                This week focus
              </p>
              <h2 className="section-title">Keep it consistent</h2>
            </div>
            <span className="tag">Lift first</span>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <p>2 strength sessions, 1-2 kettlebell bursts, 2-4 rides.</p>
            <p>Hard rides are capped at 2/week. Easy rides stay easy.</p>
            <p>Legs cooked? Back off squats before deadlifts.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="button-primary" href="/log">
              Log a session
            </Link>
            <Link className="button-secondary" href="/plan">
              View week plan
            </Link>
          </div>
        </div>

        {sessions.length ? (
          <div className="card p-6">
            <h3 className="section-title">Latest sessions</h3>
            <div className="mt-4 grid gap-3">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {session.title ?? session.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(session.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="tag">{session.type}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No sessions logged yet"
            detail="Log your first strength session or import rides to see trends."
          />
        )}
      </section>
    </div>
  );
}
