import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  firstName:   z.string().min(1).optional(),
  lastName:    z.string().min(1).optional(),
  phone:       z.string().optional(),
  avatarUrl:   z.string().optional().nullable(),
  percentRate: z.number().min(0).max(100).optional(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.parse(await req.json());
  const { firstName, lastName, phone, avatarUrl, isActive, ...trainerFields } = body;

  const trainer = await prisma.trainer.findUniqueOrThrow({ where: { id } });

  if (firstName || lastName || phone !== undefined || avatarUrl !== undefined || isActive !== undefined) {
    await prisma.user.update({
      where: { id: trainer.userId },
      data: { firstName, lastName, phone, avatarUrl, isActive },
    });
  }

  const updated = await prisma.trainer.update({
    where: { id },
    data: trainerFields,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, isActive: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) return NextResponse.json({ error: "Фотограф не найден" }, { status: 404 });

  await prisma.classEvent.updateMany({
    where: { trainerId: id },
    data: { trainerId: null },
  });

  await prisma.trainer.delete({ where: { id } });
  await prisma.user.delete({ where: { id: trainer.userId } });

  return NextResponse.json({ success: true });
}
