import type { Units } from "@/lib/settings";

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

export const metersToKm = (meters: number) => meters / 1000;
export const metersToMiles = (meters: number) => meters / 1609.344;
export const metersToFeet = (meters: number) => meters * 3.28084;
export const kmToMeters = (km: number) => km * 1000;
export const milesToMeters = (miles: number) => miles * 1609.344;
export const feetToMeters = (feet: number) => feet / 3.28084;

export const mpsToKph = (mps: number) => mps * 3.6;
export const mpsToMph = (mps: number) => mps * 2.236936;
export const kphToMps = (kph: number) => kph / 3.6;
export const mphToMps = (mph: number) => mph / 2.236936;

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;

export const formatDistance = (meters: number, units: Units) => {
  const value = units === "metric" ? metersToKm(meters) : metersToMiles(meters);
  const label = units === "metric" ? "km" : "mi";
  return `${number.format(value)} ${label}`;
};

export const formatElevation = (meters: number, units: Units) => {
  const value = units === "metric" ? meters : metersToFeet(meters);
  const label = units === "metric" ? "m" : "ft";
  return `${number.format(value)} ${label}`;
};

export const formatSpeed = (mps: number, units: Units) => {
  const value = units === "metric" ? mpsToKph(mps) : mpsToMph(mps);
  const label = units === "metric" ? "km/h" : "mph";
  return `${number.format(value)} ${label}`;
};

export const formatWeight = (kg: number, units: Units) => {
  const value = units === "metric" ? kg : kgToLb(kg);
  const label = units === "metric" ? "kg" : "lb";
  return `${number.format(value)} ${label}`;
};

export const toKg = (value: number, units: Units) => {
  return units === "metric" ? value : lbToKg(value);
};

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

export const secondsToClock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
};

export const parseDurationToSeconds = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? 0 : Math.round(numeric);
  }
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

export const epley1RM = (weightKg: number, reps: number) => {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
};

export const distanceToMeters = (value: number, units: Units) => {
  return units === "metric" ? kmToMeters(value) : milesToMeters(value);
};

export const elevationToMeters = (value: number, units: Units) => {
  return units === "metric" ? value : feetToMeters(value);
};

export const speedToMps = (value: number, units: Units) => {
  return units === "metric" ? kphToMps(value) : mphToMps(value);
};
