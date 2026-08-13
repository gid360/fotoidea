import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { amount, paymentMethod = "CASH", cashPart, cardPart } = await req.json();
  const numAmount = Number(amount);
  const isMixed   = paymentMethod === "MIXED";

  // Update client deposit
  const client = await prisma.client.update({
    where: { id },
    data:  { depositBalance: { increment: numAmount } },
  });

  await prisma.auditLog.create({
    data: {
      action:   `${numAmount > 0 ? "Пополнил депозит" : "Списал с депозита"} на ${Math.abs(numAmount)} ₸${isMixed ? ` (смешанная: нал ${cashPart} ₸ + карта ${cardPart} ₸)` : ""}`,
      userId:   session.user.id,
      clientId: id,
    },
  });

  // If it's a top-up (positive amount), add INCOME entry(ies) to the open cash shift
  let cashEntry = null;
  if (numAmount > 0) {
    const openShift = await prisma.cashShift.findFirst({
      where: { closedAt: null },
      orderBy: { openedAt: "desc" },
    });

    if (openShift) {
      const desc = `Пополнение депозита: ${client.lastName} ${client.firstName}`;

      if (isMixed) {
        // Две транзакции: наличные и карта
        const cashAmt = Number(cashPart ?? 0);
        const cardAmt = Number(cardPart ?? 0);
        const entries = [];
        if (cashAmt > 0) {
          entries.push(prisma.cashTransaction.create({
            data: { shiftId: openShift.id, type: "INCOME", category: "DEPOSIT_TOPUP", paymentMethod: "CASH", amount: cashAmt, description: desc, clientId: id, createdById: session.user.id },
          }));
        }
        if (cardAmt > 0) {
          entries.push(prisma.cashTransaction.create({
            data: { shiftId: openShift.id, type: "INCOME", category: "DEPOSIT_TOPUP", paymentMethod: "CARD", amount: cardAmt, description: desc, clientId: id, createdById: session.user.id },
          }));
        }
        const results = await Promise.all(entries);
        cashEntry = results[0] ?? null;
      } else {
        cashEntry = await prisma.cashTransaction.create({
          data: { shiftId: openShift.id, type: "INCOME", category: "DEPOSIT_TOPUP", paymentMethod, amount: numAmount, description: desc, clientId: id, createdById: session.user.id },
        });
      }
    }
  }

  return NextResponse.json({
    depositBalance: client.depositBalance,
    cashEntry,
    noShift: numAmount > 0 && !cashEntry,
  });
}
