"use client";

import { useSettings } from "@/components/SettingsProvider";

export const UnitToggle = () => {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <button
        type="button"
        onClick={() => updateSettings({ units: "metric" })}
        className={settings.units === "metric" ? "text-ink" : "opacity-60"}
      >
        Metric
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => updateSettings({ units: "imperial" })}
        className={settings.units === "imperial" ? "text-ink" : "opacity-60"}
      >
        Imperial
      </button>
    </div>
  );
};
