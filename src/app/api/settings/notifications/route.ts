import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(templates);
}

const patchSchema = z.object({ body: z.string().min(1), isActive: z.boolean().optional() });

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...data } = z.object({ id: z.string(), body: z.string().min(1), isActive: z.boolean().optional() }).parse(await req.json());
  const tmpl = await prisma.notificationTemplate.update({ where: { id }, data });
  return NextResponse.json(tmpl);
}
