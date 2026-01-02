import { z } from "zod";

export const strengthEntrySchema = z.object({
  lift: z.enum([
    "squat",
    "bench",
    "row",
    "deadlift",
    "ohp",
    "split_squat",
    "hip_thrust",
    "pullups"
  ]),
  sets: z.number().int().min(1),
  reps: z.number().int().min(1),
  weightKg: z.number().min(0),
  completedSets: z.number().int().min(0).optional().nullable(),
  completedReps: z.number().int().min(0).optional().nullable(),
  isOptional: z.boolean().optional().default(false)
});

export const kettlebellEntrySchema = z.object({
  protocol: z.enum(["A_rounds", "B_emom"]),
  bellsKg: z.number().int().min(1).default(16),
  roundsCompleted: z.number().int().min(0).optional().nullable(),
  emomMinutesCompleted: z.number().int().min(0).optional().nullable(),
  swingsPerRound: z.number().int().min(1).default(10),
  squatsPerRound: z.number().int().min(1).default(10),
  pushupsTarget: z.number().int().min(0).optional().nullable()
});

export const rideEntrySchema = z.object({
  source: z.enum(["import", "manual"]),
  startTime: z.string().optional().nullable(),
  durationSeconds: z.number().int().min(1),
  distanceM: z.number().min(0),
  elevationM: z.number().min(0).optional().nullable(),
  avgSpeedMps: z.number().min(0).optional().nullable(),
  effort: z.enum(["easy", "moderate", "hard"]).optional().nullable(),
  activityName: z.string().optional().nullable(),
  fingerprint: z.string().optional().nullable()
});

export const workoutSessionSchema = z.object({
  date: z.string(),
  type: z.enum(["strength", "kettlebell", "ride"]),
  title: z.string().optional().nullable(),
  durationSeconds: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  legsCooked: z.boolean().optional().default(false),
  strengthEntries: z.array(strengthEntrySchema).optional(),
  kettlebellEntry: kettlebellEntrySchema.optional(),
  rideEntry: rideEntrySchema.optional()
});

export const rideImportSchema = z.object({
  rides: z.array(
    z.object({
      startTime: z.string(),
      durationSeconds: z.number().int().min(1),
      distanceM: z.number().min(0),
      elevationM: z.number().min(0).optional().nullable(),
      avgSpeedMps: z.number().min(0).optional().nullable(),
      activityName: z.string().optional().nullable(),
      effort: z.enum(["easy", "moderate", "hard"]).optional().nullable()
    })
  )
});

export const checkinSchema = z.object({
  date: z.string(),
  sleep: z.number().int().min(1).max(5),
  fatigue: z.number().int().min(1).max(5),
  motivation: z.number().int().min(1).max(5),
  weightKg: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});
