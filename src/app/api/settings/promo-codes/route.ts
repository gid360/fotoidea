import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  code:      z.string().min(2).max(32).toUpperCase(),
  type:      z.enum(["FIXED", "PERCENT"]),
  value:     z.number().positive(),
  maxUses:   z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  note:      z.string().max(200).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await (prisma as any).promoCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  const existing = await (prisma as any).promoCode.findUnique({ where: { code: body.code } });
  if (existing) return NextResponse.json({ error: "Промокод уже существует" }, { status: 409 });

  const code = await (prisma as any).promoCode.create({
    data: {
      code:      body.code,
      type:      body.type,
      value:     body.value,
      maxUses:   body.maxUses ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      note:      body.note ?? null,
    },
  });
  return NextResponse.json(code, { status: 201 });
}
