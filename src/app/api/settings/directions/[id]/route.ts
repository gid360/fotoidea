import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  colorHex:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon:        z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = schema.parse(await req.json());
  const dir = await prisma.trainingDirection.update({ where: { id }, data: body });
  return NextResponse.json(dir);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dir = await prisma.trainingDirection.findUnique({ where: { id } });
  if (!dir) return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });

  if (dir.isActive) {
    await prisma.trainingDirection.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ archived: true });
  } else {
    // Отвязываем события или удаляем
    await prisma.classEvent.deleteMany({ where: { directionId: id } }).catch(() => null);
    await prisma.trainingDirection.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }
}
