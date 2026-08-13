import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  type:      z.enum(["FIXED", "PERCENT"]).optional(),
  value:     z.number().positive().optional(),
  maxUses:   z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  note:      z.string().max(200).nullable().optional(),
  isActive:  z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = patchSchema.parse(await req.json());

  const data: Record<string, unknown> = { ...body };
  if ("expiresAt" in body) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  const code = await (prisma as any).promoCode.update({ where: { id }, data });
  return NextResponse.json(code);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await (prisma as any).promoCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
