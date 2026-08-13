import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });
  return NextResponse.json(leads);
}

const createSchema = z.object({
  name:   z.string().optional(),
  phone:  z.string().optional(),
  source: z.enum(["INSTAGRAM", "WHATSAPP", "MANUAL", "WIDGET"]).default("MANUAL"),
  note:   z.string().optional(),
  status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const lead = await prisma.lead.create({ data: body });
  return NextResponse.json(lead, { status: 201 });
}
