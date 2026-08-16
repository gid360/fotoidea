import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoyaltyTag } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";
import { calculateClientLoyaltyTag } from "@/lib/loyalty";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "PHOTOGRAPHER") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("search"))?.trim();
  const tag = searchParams.get("tag") as LoyaltyTag | null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";

  const qDigits = q ? q.replace(/\D/g, "") : "";
  const orConditions: any[] = [];

  if (q) {
    orConditions.push(
      { firstName: { contains: q, mode: "insensitive" as const } },
      { lastName: { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q } }
    );

    if (qDigits && qDigits.length >= 2) {
      orConditions.push({ phone: { contains: qDigits } });
    }

    const words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      orConditions.push({
        AND: [
          {
            OR: [
              { firstName: { contains: words[0], mode: "insensitive" as const } },
              { lastName: { contains: words[0], mode: "insensitive" as const } },
            ],
          },
          {
            OR: [
              { firstName: { contains: words[1], mode: "insensitive" as const } },
              { lastName: { contains: words[1], mode: "insensitive" as const } },
            ],
          },
        ],
      });
    }
  }

  const where = {
    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    ...(tag ? { loyaltyTag: tag } : {}),
  };

  let prismaOrderBy: any = [{ lastName: sortOrder }, { firstName: sortOrder }];
  if (sortBy === "phone") {
    prismaOrderBy = { phone: sortOrder };
  } else if (sortBy === "status") {
    prismaOrderBy = { loyaltyTag: sortOrder };
  } else if (sortBy === "visits") {
    prismaOrderBy = { bookings: { _count: sortOrder } };
  } else if (sortBy === "totalSales") {
    prismaOrderBy = { totalSales: sortOrder };
  } else if (sortBy === "lastVisit") {
    prismaOrderBy = { lastVisit: { sort: sortOrder, nulls: "last" } };
  } else if (sortBy === "firstVisit") {
    prismaOrderBy = { firstVisit: { sort: sortOrder, nulls: "last" } };
  }

  const [total, rawClients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: { where: { status: { not: "CANCELLED" } } },
          },
        },
        bookings: {
          where: { status: { not: "CANCELLED" } },
          select: {
            createdAt: true,
            status: true,
            classEvent: {
              select: {
                startAt: true,
                totalPrice: true,
                servicePrice: true,
                extraPeopleFee: true,
                wardrobeFee: true,
              },
            },
          },
          orderBy: { classEvent: { startAt: "asc" } },
        },
      },
      orderBy: prismaOrderBy,
      skip,
      take: limit,
    }),
  ]);

  const now = new Date();

  const clients = rawClients.map(c => {
    const pastBookings = c.bookings.filter(b => {
      const startAt = b.classEvent?.startAt || b.createdAt;
      return startAt && new Date(startAt) <= now;
    });

    const firstBooking = pastBookings[0];
    const lastBooking = pastBookings.length > 0 ? pastBookings[pastBookings.length - 1] : null;

    const firstVisit = c.firstVisit && new Date(c.firstVisit) <= now
      ? c.firstVisit
      : (firstBooking ? (firstBooking.classEvent?.startAt || firstBooking.createdAt) : null);

    const lastVisit = c.lastVisit && new Date(c.lastVisit) <= now
      ? c.lastVisit
      : (lastBooking ? (lastBooking.classEvent?.startAt || lastBooking.createdAt) : null);

    const totalSales = Number(c.totalSales) > 0 ? Number(c.totalSales) : c.bookings.reduce((sum, b) => {
      const ev = b.classEvent;
      if (!ev) return sum;
      const tot = Number(ev.totalPrice) > 0
        ? Number(ev.totalPrice)
        : (Number(ev.servicePrice || 0) + Number(ev.extraPeopleFee || 0) + Number(ev.wardrobeFee || 0));
      return sum + tot;
    }, 0);

    const loyaltyTag = calculateClientLoyaltyTag({
      createdAt: c.createdAt,
      firstVisit,
      lastVisit,
      bookingsCount: c._count.bookings,
      bookings: c.bookings,
    });

    if (loyaltyTag !== c.loyaltyTag) {
      prisma.client.update({
        where: { id: c.id },
        data: { loyaltyTag },
      }).catch(() => {});
    }

    const { bookings, ...rest } = c;
    return {
      ...rest,
      loyaltyTag,
      totalSales,
      firstVisit,
      lastVisit,
    };
  });

  return NextResponse.json({
    clients,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, phone, email, birthDate, note } = body;

  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: "Имя, фамилия и телефон обязательны" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      firstName,
      lastName,
      phone: normalizePhone(phone),
      email: email || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      note: note || null,
      loyaltyTag: LoyaltyTag.NEW,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "Создал карточку клиента",
      userId: session.user.id,
      clientId: client.id,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
