import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName:  z.string().min(1).optional(),
  email:     z.string().email().optional(),
  phone:     z.string().optional(),
  role:      z.enum(["ADMIN", "SUPERADMIN", "PHOTOGRAPHER"]).optional(),
  isActive:  z.boolean().optional(),
  password:  z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.parse(await req.json());
  const { password, ...rest } = body;

  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });
    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ошибка при архивации пользователя" }, { status: 500 });
  }
}
