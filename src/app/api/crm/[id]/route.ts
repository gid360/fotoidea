import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status:   z.string().optional(),
  name:     z.string().optional(),
  phone:    z.string().optional(),
  note:     z.string().optional(),
  source:   z.enum(["INSTAGRAM","WHATSAPP","MANUAL","WIDGET"]).optional(),
  clientId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  const lead = await prisma.lead.update({ where: { id }, data: body });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
