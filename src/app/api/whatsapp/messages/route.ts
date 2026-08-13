import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 50;

  const where = status ? { status: status as "QUEUED" | "SENT" | "ERROR" } : {};

  const [messages, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whatsAppMessage.count({ where }),
  ]);

  return NextResponse.json({ messages, total, page, limit });
}

const sendSchema = z.object({
  phone: z.string().min(7),
  body: z.string().min(1),
  clientId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = sendSchema.parse(await req.json());

  const msg = await sendWhatsAppMessage({
    phone: data.phone,
    body: data.body,
    clientId: data.clientId,
  });

  return NextResponse.json(msg, { status: 201 });
}
