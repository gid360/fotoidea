import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:           z.string().min(1),
  description:    z.string().optional().nullable(),
  colorHex:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  showInSchedule: z.boolean().optional().default(true),
  openTime:       z.string().optional().default("09:00"),
  closeTime:      z.string().optional().default("21:00"),
  isActive:       z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const halls = await prisma.hall.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    include: { _count: { select: { classEvents: true } } },
  });
  return NextResponse.json(halls);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());

  const lastHall = await prisma.hall.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastHall?.sortOrder ?? -1) + 1;

  const hall = await prisma.hall.create({
    data: { ...body, sortOrder },
  });
  return NextResponse.json(hall, { status: 201 });
}
