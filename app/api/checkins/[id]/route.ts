import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.dailyCheckin.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
