import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const directions = await prisma.trainingDirection.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });
  return NextResponse.json(directions);
}
