"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { toKg } from "@/lib/units";

export const KettlebellSessionForm = () => {
  const { settings } = useSettings();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [protocol, setProtocol] = useState<"A_rounds" | "B_emom">("A_rounds");
  const [bells, setBells] = useState(16);
  const [rounds, setRounds] = useState(6);
  const [emom, setEmom] = useState(10);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("Saving...");
    const payload = {
      date,
      type: "kettlebell",
      title: protocol === "A_rounds" ? "KB Option A" : "KB Option B",
      notes,
      kettlebellEntry: {
        protocol,
        bellsKg: Math.round(toKg(bells, settings.units)),
        roundsCompleted: protocol === "A_rounds" ? rounds : null,
        emomMinutesCompleted: protocol === "B_emom" ? emom : null,
        swingsPerRound: 10,
        squatsPerRound: 10,
        pushupsTarget: protocol === "A_rounds" ? 12 : null
      }
    };

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus("Saved. Quick and clean.");
      setNotes("");
    } else {
      setStatus("Something went wrong. Try again.");
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Kettlebell</p>
          <h3 className="section-title">20-30 min density</h3>
          <p className="text-sm text-slate-500">Option A rounds or Option B EMOM.</p>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={protocol === "A_rounds" ? "button-primary" : "button-secondary"}
          onClick={() => setProtocol("A_rounds")}
        >
          Option A: Rounds
        </button>
        <button
          type="button"
          className={protocol === "B_emom" ? "button-primary" : "button-secondary"}
          onClick={() => setProtocol("B_emom")}
        >
          Option B: EMOM
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <p className="label">Bells ({settings.units === "metric" ? "kg" : "lb"})</p>
          <input
            className="input"
            type="number"
            value={bells}
            onChange={(event) => setBells(Number(event.target.value))}
          />
        </div>
        {protocol === "A_rounds" ? (
          <div>
            <p className="label">Rounds completed</p>
            <input
              className="input"
              type="number"
              value={rounds}
              onChange={(event) => setRounds(Number(event.target.value))}
            />
          </div>
        ) : (
          <div>
            <p className="label">EMOM minutes</p>
            <input
              className="input"
              type="number"
              value={emom}
              onChange={(event) => setEmom(Number(event.target.value))}
            />
          </div>
        )}
        <div>
          <p className="label">Notes</p>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Breathing, pace, grip"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Option A: 10 swings, 10 goblet squats, 10-15 push-ups, 60s rest.
        </p>
        <button className="button-primary" type="button" onClick={handleSubmit}>
          Save KB Session
        </button>
      </div>
      {status ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}
    </div>
  );
};
