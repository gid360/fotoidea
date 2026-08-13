import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trainers = await prisma.trainer.findMany({
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: [
      { user: { firstName: "asc" } },
      { user: { lastName: "asc" } },
    ],
  });
  return NextResponse.json(trainers);
}
