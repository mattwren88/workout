"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { toKg } from "@/lib/units";

export const CheckinForm = () => {
  const { settings } = useSettings();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sleep, setSleep] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [motivation, setMotivation] = useState(4);
  const [weight, setWeight] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("Saving...");
    const payload = {
      date,
      sleep,
      fatigue,
      motivation,
      weightKg: weight > 0 ? toKg(weight, settings.units) : null,
      notes
    };

    const response = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus("Check-in saved.");
    } else {
      setStatus("Something went wrong. Try again.");
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Daily check-in</p>
          <h3 className="section-title">Recovery snapshot</h3>
          <p className="text-sm text-slate-500">Track sleep, fatigue, motivation, weight.</p>
        </div>
        <div>
          <p className="label">Date</p>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div>
          <p className="label">Sleep (1-5)</p>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={sleep}
            onChange={(event) => setSleep(Number(event.target.value))}
          />
        </div>
        <div>
          <p className="label">Fatigue (1-5)</p>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={fatigue}
            onChange={(event) => setFatigue(Number(event.target.value))}
          />
        </div>
        <div>
          <p className="label">Motivation (1-5)</p>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={motivation}
            onChange={(event) => setMotivation(Number(event.target.value))}
          />
        </div>
        <div>
          <p className="label">Body weight ({settings.units === "metric" ? "kg" : "lb"})</p>
          <input
            className="input"
            type="number"
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="label">Notes</p>
        <input
          className="input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Sleep, stress, soreness"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-slate-500">Keep it quick and honest.</p>
        <button className="button-primary" type="button" onClick={handleSubmit}>
          Save Check-in
        </button>
      </div>
      {status ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}
    </div>
  );
};
