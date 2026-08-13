import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [client, cashTxns] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      select: { depositBalance: true },
    }),
    prisma.cashTransaction.findMany({
      where: { clientId: id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        category: true,
        paymentMethod: true,
        amount: true,
        description: true,
        date: true,
      },
    }),
  ]);

  return NextResponse.json({ depositBalance: client?.depositBalance ?? 0, cashTxns, subscriptions: [] });
}
