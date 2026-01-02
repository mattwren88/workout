import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

const strengthTemplates = {
  A: [
    { lift: "squat", sets: 3, reps: 5 },
    { lift: "bench", sets: 5, reps: 5 },
    { lift: "row", sets: 4, reps: 6 }
  ],
  B: [
    { lift: "deadlift", sets: 3, reps: 5 },
    { lift: "ohp", sets: 5, reps: 3 },
    { lift: "split_squat", sets: 3, reps: 8 }
  ]
} as const;

const random = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

async function main() {
  await prisma.dailyCheckin.deleteMany();
  await prisma.workoutSession.deleteMany();

  const today = new Date();

  for (let dayOffset = 0; dayOffset < 21; dayOffset += 1) {
    const date = subDays(today, dayOffset);
    await prisma.dailyCheckin.create({
      data: {
        date,
        sleep: Math.ceil(random(2, 5)),
        fatigue: Math.ceil(random(2, 5)),
        motivation: Math.ceil(random(2, 5)),
        weightKg: random(76, 80),
        notes: dayOffset % 4 === 0 ? "Solid sleep." : null
      }
    });
  }

  for (let week = 0; week < 4; week += 1) {
    const weekStart = subDays(today, week * 7);

    for (const [index, key] of ["A", "B"].entries()) {
      const sessionDate = addDays(weekStart, index * 3 + 1);
      await prisma.workoutSession.create({
        data: {
          date: sessionDate,
          type: "strength",
          title: `Strength ${key}`,
          rpe: 7,
          strengthEntries: {
            create: strengthTemplates[key as "A" | "B"].map((entry) => ({
              ...entry,
              weightKg: random(60, 110),
              completedSets: entry.sets,
              completedReps: entry.reps
            }))
          }
        }
      });
    }

    for (let rideIndex = 0; rideIndex < 3; rideIndex += 1) {
      const rideDate = addDays(weekStart, rideIndex * 2);
      await prisma.workoutSession.create({
        data: {
          date: rideDate,
          type: "ride",
          title: "Ride",
          durationSeconds: 3600 + rideIndex * 900,
          rideEntry: {
            create: {
              source: "manual",
              startTime: rideDate,
              durationSeconds: 3600 + rideIndex * 900,
              distanceM: 25000 + rideIndex * 5000,
              elevationM: 300 + rideIndex * 80,
              avgSpeedMps: 7 + rideIndex * 0.6,
              effort: rideIndex === 2 ? "hard" : "easy"
            }
          }
        }
      });
    }

    if (week % 2 === 0) {
      const kbDate = addDays(weekStart, 4);
      await prisma.workoutSession.create({
        data: {
          date: kbDate,
          type: "kettlebell",
          title: "KB Option A",
          kettlebellEntry: {
            create: {
              protocol: "A_rounds",
              bellsKg: 16,
              roundsCompleted: 6,
              swingsPerRound: 10,
              squatsPerRound: 10,
              pushupsTarget: 12
            }
          }
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
