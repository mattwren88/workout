"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";

const dayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" }
];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [kbDays, setKbDays] = useState(settings.kbDays);

  const toggleKbDay = (day: number) => {
    setKbDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <h2 className="section-title">Settings</h2>
        <p className="text-sm text-slate-500">Personalize schedule and units.</p>
      </div>

      <div className="card p-6">
        <h3 className="section-title">Units</h3>
        <div className="mt-3 flex gap-2">
          <button
            className={settings.units === "metric" ? "button-primary" : "button-secondary"}
            type="button"
            onClick={() => updateSettings({ units: "metric" })}
          >
            Metric (kg, km)
          </button>
          <button
            className={settings.units === "imperial" ? "button-primary" : "button-secondary"}
            type="button"
            onClick={() => updateSettings({ units: "imperial" })}
          >
            Imperial (lb, mi)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="section-title">Strength days</h3>
          <div className="mt-4 grid gap-3">
            <label className="text-sm text-slate-600">
              <span className="label">Strength A</span>
              <select
                className="input"
                value={settings.strengthDays.A}
                onChange={(event) =>
                  updateSettings({
                    strengthDays: {
                      ...settings.strengthDays,
                      A: Number(event.target.value)
                    }
                  })
                }
              >
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              <span className="label">Strength B</span>
              <select
                className="input"
                value={settings.strengthDays.B}
                onChange={(event) =>
                  updateSettings({
                    strengthDays: {
                      ...settings.strengthDays,
                      B: Number(event.target.value)
                    }
                  })
                }
              >
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title">Kettlebell days</h3>
          <p className="text-sm text-slate-500">Select 1-2 days.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleKbDay(day.value)}
                className={
                  kbDays.includes(day.value) ? "button-primary" : "button-secondary"
                }
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <button
              className="button-secondary"
              type="button"
              onClick={() => updateSettings({ kbDays })}
            >
              Save KB days
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title">Ride goals</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-sm text-slate-600">
            <span className="label">Weekly hours</span>
            <input
              className="input"
              type="number"
              value={settings.rideTargets.weeklyHours}
              onChange={(event) =>
                updateSettings({
                  rideTargets: {
                    ...settings.rideTargets,
                    weeklyHours: Number(event.target.value)
                  }
                })
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="label">Min rides</span>
            <input
              className="input"
              type="number"
              value={settings.rideTargets.minRides}
              onChange={(event) =>
                updateSettings({
                  rideTargets: {
                    ...settings.rideTargets,
                    minRides: Number(event.target.value)
                  }
                })
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="label">Hard ride cap</span>
            <input
              className="input"
              type="number"
              value={settings.rideTargets.maxHardRides}
              onChange={(event) =>
                updateSettings({
                  rideTargets: {
                    ...settings.rideTargets,
                    maxHardRides: Number(event.target.value)
                  }
                })
              }
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="label">Long ride day</span>
            <select
              className="input"
              value={settings.rideTargets.longRideDay}
              onChange={(event) =>
                updateSettings({
                  rideTargets: {
                    ...settings.rideTargets,
                    longRideDay: Number(event.target.value)
                  }
                })
              }
            >
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
