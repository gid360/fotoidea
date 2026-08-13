import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name:         z.string().min(1).optional(),
  description:  z.string().optional().nullable(),
  imageUrl:     z.string().optional().nullable(),
  category:     z.string().optional().nullable(),
  durationMin:  z.number().int().optional(),
  peopleCount:  z.number().int().min(1).optional(),
  hallIds:      z.array(z.string()).optional(),
  price:        z.number().min(0).optional(),
  isPriceRange: z.boolean().optional(),
  priceTo:      z.number().min(0).optional().nullable(),
  priceTiers:   z.any().optional().nullable(),
  isPerPerson:  z.boolean().optional(),
  isActive:     z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  const { hallIds, ...data } = body;

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...data,
      halls: hallIds ? { set: hallIds.map(hId => ({ id: hId })) } : undefined,
    },
    include: { halls: { select: { id: true, name: true, colorHex: true } } },
  });
  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.subscriptionPlan.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
