import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, isActive: true, avatarUrl: true } },
      _count: { select: { classEvents: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });
  return NextResponse.json(trainers);
}

const createSchema = z.object({
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  phone:           z.string().optional(),
  email:           z.string().email().optional(),
  avatarUrl:       z.string().optional().nullable(),
  password:        z.string().min(6),
  percentRate:     z.number().min(0).max(100).default(50),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      firstName: body.firstName,
      lastName:  body.lastName,
      phone:     body.phone,
      email:     body.email,
      avatarUrl: body.avatarUrl,
      passwordHash,
      role:      "TRAINER",
      isActive:  true,
    },
  });

  const trainer = await prisma.trainer.create({
    data: {
      userId:      user.id,
      percentRate: body.percentRate,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, isActive: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(trainer, { status: 201 });
}
