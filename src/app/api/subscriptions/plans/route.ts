import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const planSchema = z.object({
  name:         z.string().min(1),
  description:  z.string().optional().nullable(),
  imageUrl:     z.string().optional().nullable(),
  category:     z.string().optional().nullable(),
  durationMin:  z.number().int().default(60),
  peopleCount:  z.number().int().min(1).default(1),
  hallIds:      z.array(z.string()).optional().default([]),
  price:        z.number().min(0),
  isPriceRange: z.boolean().optional().default(false),
  priceTo:      z.number().min(0).optional().nullable(),
  priceTiers:   z.any().optional().nullable(),
  isPerPerson:  z.boolean().optional().default(false),
  isActive:     z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      halls: { select: { id: true, name: true, colorHex: true } },
    },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = planSchema.parse(await req.json());
  const { hallIds = [], ...data } = body;
  
  const lastPlan = await prisma.subscriptionPlan.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastPlan?.sortOrder ?? -1) + 1;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      ...data,
      sortOrder,
      halls: hallIds.length > 0 ? { connect: hallIds.map(id => ({ id })) } : undefined,
    },
    include: { halls: { select: { id: true, name: true, colorHex: true } } },
  });
  return NextResponse.json(plan, { status: 201 });
}
