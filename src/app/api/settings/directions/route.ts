import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1),
  description: z.string().optional().nullable(),
  colorHex:    z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon:        z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dirs = await prisma.trainingDirection.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    include: { _count: { select: { classEvents: true } } },
  });
  return NextResponse.json(dirs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());

  const lastDir = await prisma.trainingDirection.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastDir?.sortOrder ?? -1) + 1;

  const dir = await prisma.trainingDirection.create({
    data: { ...body, sortOrder },
  });
  return NextResponse.json(dir, { status: 201 });
}
