export type Units = "metric" | "imperial";

export type Settings = {
  units: Units;
  weekStartsOn: 1;
  strengthDays: {
    A: number;
    B: number;
  };
  kbDays: number[];
  rideTargets: {
    minRides: number;
    maxHardRides: number;
    weeklyHours: number;
    longRideDay: number;
  };
};

export const defaultSettings: Settings = {
  units: "metric",
  weekStartsOn: 1,
  strengthDays: {
    A: 2,
    B: 5
  },
  kbDays: [3],
  rideTargets: {
    minRides: 2,
    maxHardRides: 2,
    weeklyHours: 6,
    longRideDay: 6
  }
};

export const SETTINGS_STORAGE_KEY = "workout.settings.v1";
