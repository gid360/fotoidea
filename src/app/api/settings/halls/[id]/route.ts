import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:           z.string().min(1).optional(),
  description:    z.string().optional().nullable(),
  colorHex:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  showInSchedule: z.boolean().optional(),
  openTime:       z.string().optional(),
  closeTime:      z.string().optional(),
  isActive:       z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = schema.parse(await req.json());
  const hall = await prisma.hall.update({ where: { id }, data: body });
  return NextResponse.json(hall);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.hall.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
