import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rideImportSchema } from "@/lib/validation";
import { makeFingerprint } from "@/lib/fingerprint";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = rideImportSchema.parse(body);

  let created = 0;
  let skipped = 0;

  for (const ride of parsed.rides) {
    const fingerprint = makeFingerprint({
      startTime: ride.startTime,
      durationSeconds: ride.durationSeconds,
      distanceM: ride.distanceM,
      activityName: ride.activityName
    });

    const existing = await prisma.rideEntry.findUnique({
      where: { fingerprint }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.workoutSession.create({
      data: {
        date: new Date(ride.startTime),
        type: "ride",
        title: ride.activityName ?? "Ride",
        durationSeconds: ride.durationSeconds,
        rideEntry: {
          create: {
            source: "import",
            startTime: new Date(ride.startTime),
            durationSeconds: ride.durationSeconds,
            distanceM: ride.distanceM,
            elevationM: ride.elevationM ?? null,
            avgSpeedMps: ride.avgSpeedMps ?? null,
            effort: ride.effort ?? null,
            activityName: ride.activityName ?? null,
            fingerprint
          }
        }
      }
    });

    created += 1;
  }

  return NextResponse.json({ created, skipped });
}
