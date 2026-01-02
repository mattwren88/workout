"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import {
  distanceToMeters,
  elevationToMeters,
  kgToLb,
  metersToKm,
  metersToMiles,
  parseDurationToSeconds,
  secondsToClock,
  speedToMps
} from "@/lib/units";

const liftLabels: Record<string, string> = {
  squat: "Back Squat",
  bench: "Bench Press",
  row: "Barbell Row",
  deadlift: "Deadlift",
  ohp: "Overhead Press",
  split_squat: "Bulgarian Split Squat",
  hip_thrust: "Hip Thrust",
  pullups: "Chin-ups"
};

type StrengthEntry = {
  id?: string;
  lift: string;
  sets: number;
  reps: number;
  weight: number;
  completedSets?: number | null;
  completedReps?: number | null;
  isOptional: boolean;
};

type SessionForm = {
  id: string;
  date: string;
  type: "strength" | "kettlebell" | "ride";
  title: string;
  duration: string;
  notes: string;
  rpe: number;
  legsCooked: boolean;
  strengthEntries: StrengthEntry[];
  kettlebellEntry?: {
    protocol: "A_rounds" | "B_emom";
    bells: number;
    roundsCompleted?: number | null;
    emomMinutesCompleted?: number | null;
  };
  rideEntry?: {
    duration: string;
    distance: number;
    elevation: number;
    avgSpeed: number;
    effort: "easy" | "moderate" | "hard" | null;
    source?: "import" | "manual";
    fingerprint?: string | null;
  };
};

export default function SessionEditPage() {
  const params = useParams();
  const router = useRouter();
  const { settings } = useSettings();
  const [form, setForm] = useState<SessionForm | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/sessions/${params.id}`);
      const data = await response.json();
      const session = data.session;
      if (!session) return;

      const strengthEntries = (session.strengthEntries ?? []).map((entry: any) => ({
        id: entry.id,
        lift: entry.lift,
        sets: entry.sets,
        reps: entry.reps,
        weight: settings.units === "metric" ? entry.weightKg : kgToLb(entry.weightKg),
        completedSets: entry.completedSets ?? entry.sets,
        completedReps: entry.completedReps ?? entry.reps,
        isOptional: entry.isOptional
      }));

      const rideEntry = session.rideEntry
        ? {
            duration: secondsToClock(session.rideEntry.durationSeconds),
            distance:
              settings.units === "metric"
                ? metersToKm(session.rideEntry.distanceM)
                : metersToMiles(session.rideEntry.distanceM),
            elevation:
              settings.units === "metric"
                ? session.rideEntry.elevationM ?? 0
                : (session.rideEntry.elevationM ?? 0) * 3.28084,
            avgSpeed: session.rideEntry.avgSpeedMps
              ? settings.units === "metric"
                ? session.rideEntry.avgSpeedMps * 3.6
                : session.rideEntry.avgSpeedMps * 2.236936
              : 0,
            effort: session.rideEntry.effort ?? null,
            source: session.rideEntry.source ?? "manual",
            fingerprint: session.rideEntry.fingerprint ?? null
          }
        : undefined;

      const kettlebellEntry = session.kettlebellEntry
        ? {
            protocol: session.kettlebellEntry.protocol,
            bells:
              settings.units === "metric"
                ? session.kettlebellEntry.bellsKg
                : session.kettlebellEntry.bellsKg * 2.20462,
            roundsCompleted: session.kettlebellEntry.roundsCompleted ?? null,
            emomMinutesCompleted: session.kettlebellEntry.emomMinutesCompleted ?? null
          }
        : undefined;

      setForm({
        id: session.id,
        date: session.date.slice(0, 10),
        type: session.type,
        title: session.title ?? session.type,
        duration: session.durationSeconds ? secondsToClock(session.durationSeconds) : "",
        notes: session.notes ?? "",
        rpe: session.rpe ?? 7,
        legsCooked: session.legsCooked ?? false,
        strengthEntries,
        kettlebellEntry,
        rideEntry
      });
    };

    load();
  }, [params.id, settings.units]);

  const updateEntry = (index: number, patch: Partial<StrengthEntry>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.strengthEntries];
      next[index] = { ...next[index], ...patch };
      return { ...prev, strengthEntries: next };
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setStatus("Saving...");

    const durationSeconds =
      form.type === "ride" && form.rideEntry
        ? parseDurationToSeconds(form.rideEntry.duration)
        : form.duration
        ? parseDurationToSeconds(form.duration)
        : null;

    const payload = {
      date: form.date,
      type: form.type,
      title: form.title,
      durationSeconds,
      notes: form.notes,
      rpe: form.rpe,
      legsCooked: form.legsCooked,
      strengthEntries:
        form.type === "strength"
          ? form.strengthEntries.map((entry) => ({
              lift: entry.lift,
              sets: entry.sets,
              reps: entry.reps,
              weightKg:
                settings.units === "metric"
                  ? entry.weight
                  : entry.weight / 2.20462,
              completedSets: entry.completedSets ?? null,
              completedReps: entry.completedReps ?? null,
              isOptional: entry.isOptional
            }))
          : undefined,
      kettlebellEntry:
        form.type === "kettlebell" && form.kettlebellEntry
          ? {
              protocol: form.kettlebellEntry.protocol,
              bellsKg:
                settings.units === "metric"
                  ? Math.round(form.kettlebellEntry.bells)
                  : Math.round(form.kettlebellEntry.bells / 2.20462),
              roundsCompleted: form.kettlebellEntry.roundsCompleted ?? null,
              emomMinutesCompleted: form.kettlebellEntry.emomMinutesCompleted ?? null,
              swingsPerRound: 10,
              squatsPerRound: 10,
              pushupsTarget: 12
            }
          : undefined,
      rideEntry:
        form.type === "ride" && form.rideEntry
          ? {
              source: form.rideEntry.source ?? "manual",
              startTime: new Date(form.date).toISOString(),
              durationSeconds: parseDurationToSeconds(form.rideEntry.duration),
              distanceM: distanceToMeters(form.rideEntry.distance, settings.units),
              elevationM: elevationToMeters(form.rideEntry.elevation, settings.units),
            avgSpeedMps:
              form.rideEntry.avgSpeed > 0
                ? speedToMps(form.rideEntry.avgSpeed, settings.units)
                : null,
              effort: form.rideEntry.effort,
              fingerprint: form.rideEntry.fingerprint ?? null
            }
          : undefined
    };

    const response = await fetch(`/api/sessions/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus("Saved.");
    } else {
      setStatus("Save failed.");
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    setStatus("Deleting...");
    const response = await fetch(`/api/sessions/${form.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/sessions");
    } else {
      setStatus("Delete failed.");
    }
  };

  const title = useMemo(() => {
    if (!form) return "Session";
    return `${form.title} | ${new Date(form.date).toLocaleDateString()}`;
  }, [form]);

  if (!form) {
    return <div className="card p-6">Loading session...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <h2 className="section-title">{title}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <p className="label">Date</p>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
          <div>
            <p className="label">Title</p>
            <input
              className="input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          {form.type === "strength" ? (
            <div>
              <p className="label">RPE</p>
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={form.rpe}
                onChange={(event) => setForm({ ...form, rpe: Number(event.target.value) })}
              />
            </div>
          ) : null}
          {form.type === "strength" ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.legsCooked}
                onChange={(event) => setForm({ ...form, legsCooked: event.target.checked })}
              />
              Legs cooked
            </label>
          ) : null}
        </div>
        <div className="mt-4">
          <p className="label">Notes</p>
          <input
            className="input"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>
      </div>

      {form.type === "strength" ? (
        <div className="card p-6">
          <h3 className="section-title">Strength entries</h3>
          <div className="mt-4 grid gap-4">
            {form.strengthEntries.map((entry, index) => (
              <div key={`${entry.lift}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{liftLabels[entry.lift] ?? entry.lift}</p>
                    <p className="text-xs text-slate-500">{entry.isOptional ? "Optional" : "Required"}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="label">Sets</p>
                    <input
                      className="input"
                      type="number"
                      value={entry.sets}
                      onChange={(event) => updateEntry(index, { sets: Number(event.target.value) })}
                    />
                  </div>
                  <div>
                    <p className="label">Reps</p>
                    <input
                      className="input"
                      type="number"
                      value={entry.reps}
                      onChange={(event) => updateEntry(index, { reps: Number(event.target.value) })}
                    />
                  </div>
                  <div>
                    <p className="label">Weight ({settings.units === "metric" ? "kg" : "lb"})</p>
                    <input
                      className="input"
                      type="number"
                      value={entry.weight}
                      onChange={(event) => updateEntry(index, { weight: Number(event.target.value) })}
                    />
                  </div>
                  <div>
                    <p className="label">Completed sets</p>
                    <input
                      className="input"
                      type="number"
                      value={entry.completedSets ?? 0}
                      onChange={(event) => updateEntry(index, { completedSets: Number(event.target.value) })}
                    />
                  </div>
                  <div>
                    <p className="label">Completed reps</p>
                    <input
                      className="input"
                      type="number"
                      value={entry.completedReps ?? 0}
                      onChange={(event) => updateEntry(index, { completedReps: Number(event.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {form.type === "kettlebell" && form.kettlebellEntry ? (
        <div className="card p-6">
          <h3 className="section-title">Kettlebell session</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="label">Protocol</p>
              <select
                className="input"
                value={form.kettlebellEntry.protocol}
                onChange={(event) =>
                  setForm({
                    ...form,
                    kettlebellEntry: {
                      ...form.kettlebellEntry!,
                      protocol: event.target.value as "A_rounds" | "B_emom"
                    }
                  })
                }
              >
                <option value="A_rounds">Option A (Rounds)</option>
                <option value="B_emom">Option B (EMOM)</option>
              </select>
            </div>
            <div>
              <p className="label">Bells ({settings.units === "metric" ? "kg" : "lb"})</p>
              <input
                className="input"
                type="number"
                value={form.kettlebellEntry.bells}
                onChange={(event) =>
                  setForm({
                    ...form,
                    kettlebellEntry: {
                      ...form.kettlebellEntry!,
                      bells: Number(event.target.value)
                    }
                  })
                }
              />
            </div>
            <div>
              <p className="label">Rounds / Minutes</p>
              <input
                className="input"
                type="number"
                value={
                  form.kettlebellEntry.protocol === "A_rounds"
                    ? form.kettlebellEntry.roundsCompleted ?? 0
                    : form.kettlebellEntry.emomMinutesCompleted ?? 0
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    kettlebellEntry: {
                      ...form.kettlebellEntry!,
                      roundsCompleted:
                        form.kettlebellEntry?.protocol === "A_rounds"
                          ? Number(event.target.value)
                          : form.kettlebellEntry.roundsCompleted,
                      emomMinutesCompleted:
                        form.kettlebellEntry?.protocol === "B_emom"
                          ? Number(event.target.value)
                          : form.kettlebellEntry.emomMinutesCompleted
                    }
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {form.type === "ride" && form.rideEntry ? (
        <div className="card p-6">
          <h3 className="section-title">Ride details</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <p className="label">Duration (HH:MM:SS)</p>
              <input
                className="input"
                value={form.rideEntry.duration}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rideEntry: { ...form.rideEntry!, duration: event.target.value }
                  })
                }
              />
            </div>
            <div>
              <p className="label">Distance ({settings.units === "metric" ? "km" : "mi"})</p>
              <input
                className="input"
                type="number"
                value={form.rideEntry.distance}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rideEntry: { ...form.rideEntry!, distance: Number(event.target.value) }
                  })
                }
              />
            </div>
            <div>
              <p className="label">Elevation ({settings.units === "metric" ? "m" : "ft"})</p>
              <input
                className="input"
                type="number"
                value={form.rideEntry.elevation}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rideEntry: { ...form.rideEntry!, elevation: Number(event.target.value) }
                  })
                }
              />
            </div>
            <div>
              <p className="label">Avg speed ({settings.units === "metric" ? "km/h" : "mph"})</p>
              <input
                className="input"
                type="number"
                value={form.rideEntry.avgSpeed}
                onChange={(event) =>
                  setForm({
                    ...form,
                    rideEntry: { ...form.rideEntry!, avgSpeed: Number(event.target.value) }
                  })
                }
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="label">Effort</p>
            <select
              className="input"
              value={form.rideEntry.effort ?? "easy"}
              onChange={(event) =>
                setForm({
                  ...form,
                  rideEntry: {
                    ...form.rideEntry!,
                    effort: event.target.value as "easy" | "moderate" | "hard"
                  }
                })
              }
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="button-secondary" type="button" onClick={handleDelete}>
          Delete session
        </button>
        <div className="flex items-center gap-3">
          {status ? <span className="text-xs text-slate-500">{status}</span> : null}
          <button className="button-primary" type="button" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
