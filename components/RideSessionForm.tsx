"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import {
  distanceToMeters,
  elevationToMeters,
  parseDurationToSeconds,
  speedToMps
} from "@/lib/units";

export const RideSessionForm = () => {
  const { settings } = useSettings();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("01:00:00");
  const [distance, setDistance] = useState(25);
  const [elevation, setElevation] = useState(250);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [effort, setEffort] = useState<"easy" | "moderate" | "hard">("easy");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("Saving...");
    const payload = {
      date,
      type: "ride",
      title: "Ride",
      durationSeconds: parseDurationToSeconds(duration),
      notes,
      rideEntry: {
        source: "manual",
        startTime: new Date(date).toISOString(),
        durationSeconds: parseDurationToSeconds(duration),
        distanceM: distanceToMeters(distance, settings.units),
        elevationM: elevationToMeters(elevation, settings.units),
        avgSpeedMps: avgSpeed > 0 ? speedToMps(avgSpeed, settings.units) : null,
        effort
      }
    };

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setStatus("Ride saved.");
      setNotes("");
    } else {
      setStatus("Something went wrong. Try again.");
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ride</p>
          <h3 className="section-title">Manual ride log</h3>
          <p className="text-sm text-slate-500">Fallback when CSV is missing.</p>
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
          <p className="label">Duration (HH:MM:SS)</p>
          <input
            className="input"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <div>
          <p className="label">Distance ({settings.units === "metric" ? "km" : "mi"})</p>
          <input
            className="input"
            type="number"
            value={distance}
            onChange={(event) => setDistance(Number(event.target.value))}
          />
        </div>
        <div>
          <p className="label">Elevation ({settings.units === "metric" ? "m" : "ft"})</p>
          <input
            className="input"
            type="number"
            value={elevation}
            onChange={(event) => setElevation(Number(event.target.value))}
          />
        </div>
        <div>
          <p className="label">Avg speed ({settings.units === "metric" ? "km/h" : "mph"})</p>
          <input
            className="input"
            type="number"
            value={avgSpeed}
            onChange={(event) => setAvgSpeed(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="label">Effort</p>
          <div className="flex flex-wrap gap-2">
            {(["easy", "moderate", "hard"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={effort === level ? "button-primary" : "button-secondary"}
                onClick={() => setEffort(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Notes</p>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Route, terrain, how it felt"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-slate-500">Hard rides are capped at 2/week.</p>
        <button className="button-primary" type="button" onClick={handleSubmit}>
          Save Ride
        </button>
      </div>
      {status ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}
    </div>
  );
};
