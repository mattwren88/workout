import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workoutSessionSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: params.id },
    include: {
      strengthEntries: true,
      kettlebellEntry: true,
      rideEntry: true
    }
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const session = await prisma.$transaction(async (tx) => {
    await tx.strengthEntry.deleteMany({ where: { sessionId: params.id } });
    await tx.kettlebellEntry.deleteMany({ where: { sessionId: params.id } });
    await tx.rideEntry.deleteMany({ where: { sessionId: params.id } });

    return tx.workoutSession.update({
      where: { id: params.id },
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
  });

  return NextResponse.json({ session });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.workoutSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
