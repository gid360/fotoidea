import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";

const LATIN_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function genCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += LATIN_CODE_CHARS.charAt(Math.floor(Math.random() * LATIN_CODE_CHARS.length));
  }
  return code;
}

const createSchema = z.object({
  type:          z.enum(["NOMINAL", "PACKAGE"]),
  nominalAmount: z.preprocess(v => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().positive().optional().nullable()),
  planId:        z.string().optional().nullable(),
  buyerName:     z.string().optional().nullable(),
  buyerPhone:    z.string().optional().nullable(),
  recipientText: z.string().optional().nullable(),
  validDays:     z.preprocess(v => (v === "" || v === null || v === undefined ? 90 : Number(v)), z.number().int().positive().optional().default(90)),
  peopleCount:   z.preprocess(v => (v === "" || v === null || v === undefined || Number(v) <= 0 ? undefined : Number(v)), z.number().int().positive().optional().nullable()),
  pricePaid:     z.preprocess(v => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().nonnegative().optional().nullable()),
  paymentMethod: z.enum(["KASPI", "HALYK", "CASH", "MIXED", "CARD"]).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { code:       { contains: q, mode: "insensitive" } },
      { buyerName:  { contains: q, mode: "insensitive" } },
      { buyerPhone: { contains: q } },
      { client: { OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName:  { contains: q, mode: "insensitive" } },
      ]}},
    ];
  }
  if (status) where.status = status;

  const certs = await prisma.certificate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });

  // Подтягиваем планы для PACKAGE отдельно
  const planIds = [...new Set(certs.filter(c => c.planId).map(c => c.planId!))];
  const plans = planIds.length
    ? await prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } })
    : [];
  const planMap = Object.fromEntries(plans.map(p => [p.id, p.name]));

  return NextResponse.json(certs.map(c => ({ ...c, planName: c.planId ? planMap[c.planId] : null })));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawJson = await req.json();
    const body = createSchema.parse(rawJson);

    let code = genCode();
    // Гарантируем уникальность
    while (await prisma.certificate.findUnique({ where: { code } })) {
      code = genCode();
    }

    const expiresAt = addDays(new Date(), body.validDays || 90);

    const cert = await prisma.certificate.create({
      data: {
        code,
        type:          body.type,
        nominalAmount: body.nominalAmount ?? undefined,
        planId:        body.planId ?? undefined,
        buyerName:     body.buyerName ?? undefined,
        buyerPhone:    body.buyerPhone ?? undefined,
        recipientText: body.recipientText ?? undefined,
        peopleCount:   body.peopleCount ?? undefined,
        expiresAt,
      },
    });

    // Записываем приход в кассу если указана сумма и способ оплаты
    if (body.pricePaid && body.pricePaid > 0 && body.paymentMethod) {
      try {
        const openShift = await prisma.cashShift.findFirst({
          where: { closedAt: null },
          orderBy: { openedAt: "desc" },
        });
        if (openShift) {
          const label = body.type === "NOMINAL"
            ? `Сертификат ${code} (номинал ${body.nominalAmount ?? 0} ₸)`
            : `Сертификат ${code} (пакетный)`;
          await prisma.cashTransaction.create({
            data: {
              shiftId:       openShift.id,
              type:          "INCOME",
              category:      "CERTIFICATE_SALE",
              paymentMethod: body.paymentMethod,
              amount:        body.pricePaid,
              description:   label,
              createdById:   session.user.id,
            },
          });
        }
      } catch (cashErr) {
        console.error("Failed to record cash shift transaction:", cashErr);
      }
    }

    return NextResponse.json(cert, { status: 201 });
  } catch (error: any) {
    console.error("Error creating certificate:", error);
    const msg = error.errors
      ? error.errors.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")
      : (error.message || "Ошибка сервера при создании сертификата");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
