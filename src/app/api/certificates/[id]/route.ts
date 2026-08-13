import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const activateSchema = z.object({
  action:   z.enum(["activate", "expire"]),
  clientId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = activateSchema.parse(await req.json());

  const cert = await prisma.certificate.findUniqueOrThrow({ where: { id } });

  if (body.action === "activate") {
    if (cert.status !== "SOLD") {
      return NextResponse.json({ error: "Сертификат уже активирован или истёк" }, { status: 400 });
    }
    if (!body.clientId) {
      return NextResponse.json({ error: "Нужен clientId для активации" }, { status: 400 });
    }

    // Для номинального или пакетного — зачислить на депозит клиента
    if (cert.nominalAmount) {
      await prisma.client.update({
        where: { id: body.clientId },
        data: { depositBalance: { increment: cert.nominalAmount } },
      });
    }

    const updated = await prisma.certificate.update({
      where: { id },
      data: { status: "ACTIVATED", clientId: body.clientId, activatedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "expire") {
    const updated = await prisma.certificate.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.certificate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
