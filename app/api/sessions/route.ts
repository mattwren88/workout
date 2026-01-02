import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workoutSessionSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {})
    };
  }
  if (type) {
    where.type = type;
  }

  const sessions = await prisma.workoutSession.findMany({
    where,
    include: {
      strengthEntries: true,
      kettlebellEntry: true,
      rideEntry: true
    },
    orderBy: { date: "desc" }
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = workoutSessionSchema.parse(body);
  const rideEntryData = parsed.rideEntry
    ? {
        ...parsed.rideEntry,
        startTime: parsed.rideEntry.startTime
          ? new Date(parsed.rideEntry.startTime)
          : null
      }
    : undefined;

  const session = await prisma.workoutSession.create({
    data: {
      date: new Date(parsed.date),
      type: parsed.type,
      title: parsed.title ?? null,
      durationSeconds: parsed.durationSeconds ?? null,
      notes: parsed.notes ?? null,
      rpe: parsed.rpe ?? null,
      legsCooked: parsed.legsCooked ?? false,
      strengthEntries: parsed.strengthEntries
        ? {
            create: parsed.strengthEntries
          }
        : undefined,
      kettlebellEntry: parsed.kettlebellEntry
        ? {
            create: parsed.kettlebellEntry
          }
        : undefined,
      rideEntry: rideEntryData
        ? {
            create: rideEntryData
          }
        : undefined
    },
    include: {
      strengthEntries: true,
      kettlebellEntry: true,
      rideEntry: true
    }
  });

  return NextResponse.json({ session });
}
