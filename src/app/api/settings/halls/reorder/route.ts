import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
  ids: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = reorderSchema.parse(await req.json());

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.hall.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
