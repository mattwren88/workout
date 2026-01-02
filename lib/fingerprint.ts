import crypto from "crypto";

type FingerprintInput = {
  startTime?: string | null;
  durationSeconds: number;
  distanceM: number;
  activityName?: string | null;
};

export const makeFingerprint = (input: FingerprintInput) => {
  const base = [
    input.startTime ?? "",
    input.durationSeconds.toFixed(0),
    input.distanceM.toFixed(1),
    (input.activityName ?? "").trim().toLowerCase()
  ].join("|");
  return crypto.createHash("sha1").update(base).digest("hex");
};
