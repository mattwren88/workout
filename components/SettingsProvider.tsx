"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultSettings, SETTINGS_STORAGE_KEY, Settings } from "@/lib/settings";

type SettingsContextValue = {
  settings: Settings;
  updateSettings: (next: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const loadSettings = (): Settings => {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored) as Partial<Settings>;
    return {
      ...defaultSettings,
      ...parsed,
      strengthDays: {
        ...defaultSettings.strengthDays,
        ...(parsed.strengthDays ?? {})
      },
      rideTargets: {
        ...defaultSettings.rideTargets,
        ...(parsed.rideTargets ?? {})
      },
      kbDays: parsed.kbDays ?? defaultSettings.kbDays
    };
  } catch {
    return defaultSettings;
  }
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = (next: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = {
        ...prev,
        ...next,
        strengthDays: {
          ...prev.strengthDays,
          ...(next.strengthDays ?? {})
        },
        rideTargets: {
          ...prev.rideTargets,
          ...(next.rideTargets ?? {})
        },
        kbDays: next.kbDays ?? prev.kbDays
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    });
  };

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
