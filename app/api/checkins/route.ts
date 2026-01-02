import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkinSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    const checkin = await prisma.dailyCheckin.findUnique({
      where: { date: new Date(date) }
    });
    return NextResponse.json({ checkin });
  }

  const checkins = await prisma.dailyCheckin.findMany({
    orderBy: { date: "desc" }
  });

  return NextResponse.json({ checkins });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = checkinSchema.parse(body);

  const checkin = await prisma.dailyCheckin.upsert({
    where: { date: new Date(parsed.date) },
    update: {
      sleep: parsed.sleep,
      fatigue: parsed.fatigue,
      motivation: parsed.motivation,
      weightKg: parsed.weightKg ?? null,
      notes: parsed.notes ?? null
    },
    create: {
      date: new Date(parsed.date),
      sleep: parsed.sleep,
      fatigue: parsed.fatigue,
      motivation: parsed.motivation,
      weightKg: parsed.weightKg ?? null,
      notes: parsed.notes ?? null
    }
  });

  return NextResponse.json({ checkin });
}
