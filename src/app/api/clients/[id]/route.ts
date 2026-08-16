import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoyaltyTag } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";
import { calculateClientLoyaltyTag } from "@/lib/loyalty";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          classEvent: {
            include: { direction: true, trainer: { include: { user: { select: { firstName: true, lastName: true } } } }, hall: true },
          },
        },
        orderBy: { classEvent: { startAt: "desc" } },
        take: 200,
      },
      documents: { orderBy: { createdAt: "desc" } },
      auditLogs: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  // Пересчитываем тег лояльности при каждом просмотре
  const newTag = calculateClientLoyaltyTag({
    createdAt: client.createdAt,
    firstVisit: client.firstVisit,
    lastVisit: client.lastVisit,
    bookingsCount: client.bookings.length,
    bookings: client.bookings,
  });
  if (newTag !== client.loyaltyTag) {
    await prisma.client.update({ where: { id }, data: { loyaltyTag: newTag } });
    client.loyaltyTag = newTag;
  }

  // Вычисляем этап воронки продаж клиента
  const digits = client.phone.replace(/\D/g, "");
  let searchPhone = digits;
  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
    searchPhone = "7" + digits.slice(1);
  }

  const sentMessagesCount = await prisma.whatsAppMessage.count({
    where: {
      OR: [
        { clientId: id },
        { phone: searchPhone }
      ],
      status: "SENT",
    },
  });

  const allBookings = client.bookings || [];
  const salesBookings = allBookings.filter(b => b.status === "CONFIRMED" || b.status === "ATTENDED");
  const salesCount = salesBookings.length;
  const visitedCount = allBookings.filter(b => b.status === "ATTENDED").length;
  const prepaidCount = allBookings.filter(b =>
    (b.status === "CONFIRMED" || b.status === "ATTENDED") &&
    Number(b.classEvent?.prepayment || 0) > 0
  ).length;

  let funnelStage = "NEW";
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { clientId: id },
        { phone: { contains: searchPhone.slice(-10) } }
      ]
    }
  });

  if (lead?.status) {
    funnelStage = lead.status;
  } else if (salesCount > 1) {
    funnelStage = "REPEAT_BUYER";
  } else if (visitedCount >= 1) {
    funnelStage = "VISITED";
  } else if (prepaidCount >= 1) {
    funnelStage = "BOUGHT";
  } else if (sentMessagesCount > 3) {
    funnelStage = "CONVERSATION";
  }

  return NextResponse.json({
    ...client,
    funnelStage,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const client = await prisma.client.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone ? normalizePhone(body.phone) : body.phone,
      email: body.email || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      note: body.note || null,
      photoUrl: body.photoUrl,
      instagramUsername: body.instagramUsername !== undefined ? (body.instagramUsername || null) : undefined,
      notifyAll: body.notifyAll,
      notifyReminders: body.notifyReminders,
      notifyMarketing: body.notifyMarketing,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: `Обновил данные клиента`,
      userId: session.user.id,
      clientId: id,
    },
  });

  if (body.funnelStageId) {
    const digits = (client.phone || "").replace(/\D/g, "");
    let searchPhone = digits;
    if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
      searchPhone = "7" + digits.slice(1);
    }
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { clientId: id },
          { phone: { contains: searchPhone.slice(-10) } }
        ]
      }
    });
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: body.funnelStageId }
      });
    } else {
      await prisma.lead.create({
        data: {
          clientId: id,
          name: `${client.firstName} ${client.lastName}`.trim(),
          phone: client.phone,
          status: body.funnelStageId,
          source: "MANUAL"
        }
      });
    }
  }

  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
