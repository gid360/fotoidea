import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { role: { in: ["SUPERADMIN", "ADMIN", "PHOTOGRAPHER"] } },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional(),
  password:  z.string().min(6),
  role:      z.enum(["ADMIN", "SUPERADMIN", "PHOTOGRAPHER"]).default("ADMIN"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const passwordHash = await bcrypt.hash(body.password, 10);

  const { password: _pw, ...rest } = body;
  const user = await prisma.user.create({
    data: { ...rest, passwordHash },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
