"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { toKg } from "@/lib/units";

export type StrengthTemplate = {
  title: string;
  description: string;
  lifts: {
    lift: string;
    label: string;
    sets: number;
    reps: number;
    isOptional?: boolean;
  }[];
};

type EntryState = {
  lift: string;
  label: string;
  sets: number;
  reps: number;
  weight: number;
  completedSets: number;
  completedReps: number;
  isOptional: boolean;
  performed: boolean;
};

export const StrengthSessionForm = ({ template }: { template: StrengthTemplate }) => {
  const { settings } = useSettings();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rpe, setRpe] = useState(7);
  const [legsCooked, setLegsCooked] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [entries, setEntries] = useState<EntryState[]>(() =>
    template.lifts.map((lift) => ({
      lift: lift.lift,
      label: lift.label,
      sets: lift.sets,
      reps: lift.reps,
      weight: 0,
      completedSets: lift.sets,
      completedReps: lift.reps,
      isOptional: Boolean(lift.isOptional),
      performed: !lift.isOptional
    }))
  );

  const totalVolume = useMemo(() => {
    return entries.reduce((sum, entry) => {
      if (!entry.performed) return sum;
      return sum + entry.sets * entry.reps * entry.weight;
    }, 0);
  }, [entries]);

  const updateEntry = (index: number, patch: Partial<EntryState>) => {
    setEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry))
    );
  };

  const handleSubmit = async () => {
    setStatus("Saving...");
    const strengthEntries = entries
      .filter((entry) => entry.performed)
      .map((entry) => ({
        lift: entry.lift,
        sets: entry.sets,
        reps: entry.reps,
        weightKg: toKg(entry.weight, settings.units),
        completedSets: entry.completedSets || null,
        completedReps: entry.completedReps || null,
        isOptional: entry.isOptional
      }));

    const payload = {
      date,
      type: "strength",
      title: template.title,
      rpe,
      legsCooked,
      notes,
      strengthEntries
    };

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus("Saved. Keep it rolling.");
      setNotes("");
    } else {
      setStatus("Something went wrong. Try again.");
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strength</p>
          <h3 className="section-title">{template.title}</h3>
          <p className="text-sm text-slate-500">{template.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="label">Date</p>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <p className="label">RPE</p>
            <input
              className="input w-20"
              type="number"
              min={1}
              max={10}
              value={rpe}
              onChange={(event) => setRpe(Number(event.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {entries.map((entry, index) => (
          <div key={`${entry.lift}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{entry.label}</p>
                <p className="text-xs text-slate-500">
                  Target {entry.sets}x{entry.reps}
                </p>
              </div>
              {entry.isOptional ? (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={entry.performed}
                    onChange={(event) => updateEntry(index, { performed: event.target.checked })}
                  />
                  Performed
                </label>
              ) : null}
            </div>
            {entry.performed ? (
              <div className="mt-4 grid gap-3 md:grid-cols-5">
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
                    value={entry.completedSets}
                    onChange={(event) => updateEntry(index, { completedSets: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <p className="label">Completed reps</p>
                  <input
                    className="input"
                    type="number"
                    value={entry.completedReps}
                    onChange={(event) => updateEntry(index, { completedReps: Number(event.target.value) })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={legsCooked}
            onChange={(event) => setLegsCooked(event.target.checked)}
          />
          Legs cooked today
        </label>
        <div className="md:col-span-2">
          <p className="label">Notes</p>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="How did it feel?"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Est. total volume: {totalVolume.toFixed(0)} {settings.units === "metric" ? "kg" : "lb"} | reps
        </p>
        <button className="button-primary" type="button" onClick={handleSubmit}>
          Save {template.title}
        </button>
      </div>
      {status ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}
    </div>
  );
};
