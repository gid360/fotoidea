import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const halls = await prisma.hall.findMany({
    where: {
      isActive: true,
      ...(includeAll ? {} : { showInSchedule: true }),
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });
  return NextResponse.json(halls);
}
