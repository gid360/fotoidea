import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { format, addHours, subDays, subHours } from "date-fns";

const CRON_SECRET = process.env.CRON_SECRET ?? "fitness-cron-secret";

function isQuietHours(date: Date, quietStart = 22, quietEnd = 9): boolean {
  const h = date.getHours();
  if (quietStart > quietEnd) return h >= quietStart || h < quietEnd;
  return h >= quietStart || h < quietEnd;
}

async function getWaConfig() {
  return prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
}

async function sendWhatsApp(params: {
  phone: string;
  body: string;
  clientId?: string;
  templateId: string;
  refId: string;
  wa?: any;
}) {
  return sendWhatsAppMessage({
    phone: params.phone,
    body: params.body,
    clientId: params.clientId,
    templateId: params.templateId,
    refId: params.refId,
  });
}


function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), tpl);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["reminderHours", "quietHoursStart", "quietHoursEnd"] } },
  });
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const reminderHours  = Number(settingsMap.reminderHours  ?? "8");
  const quietStart     = Number(settingsMap.quietHoursStart ?? "22");
  const quietEnd       = Number(settingsMap.quietHoursEnd   ?? "9");

  const quiet = isQuietHours(now, quietStart, quietEnd);

  const [birthdayTmpl, reminderTmpl, reviewTmpl, printTmpl, wa] = await Promise.all([
    prisma.notificationTemplate.findUnique({ where: { id: "birthday" } }),
    prisma.notificationTemplate.findUnique({ where: { id: "reminder" } }),
    prisma.notificationTemplate.findUnique({ where: { id: "review_request" } }),
    prisma.notificationTemplate.findUnique({ where: { id: "print_discount" } }),
    getWaConfig(),
  ]);

  const results = {
    reminders: 0,
    birthdays: 0,
    reviews: 0,
    printDiscounts: 0,
    skippedQuiet: 0,
    errors: [] as string[],
  };

  // ── 1. НАПОМИНАНИЯ О ЗАНЯТИИ / СЪЁМКЕ ─────────────────────────
  if (reminderTmpl?.isActive && !quiet) {
    const windowStart = addHours(now, reminderHours - 0.083);
    const windowEnd   = addHours(now, reminderHours + 0.083);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        classEvent: { startAt: { gte: windowStart, lte: windowEnd } },
        client: { notifyReminders: true, phone: { not: "" } },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        classEvent: {
          include: {
            direction: { select: { name: true } },
            hall:      { select: { name: true } },
          },
        },
      },
    });

    for (const booking of upcomingBookings) {
      const existing = await (prisma.whatsAppMessage as any).count({
        where: { templateId: "reminder", refId: booking.id },
      });
      if (existing > 0) continue;

      const phone = booking.client.phone.replace(/\D/g, "");
      if (!phone) continue;

      const body = fillTemplate(reminderTmpl.body, {
        client_name: `${booking.client.firstName}`,
        class_time:  format(booking.classEvent.startAt, "HH:mm"),
        class_date:  format(booking.classEvent.startAt, "d MMMM"),
        direction:   booking.classEvent.direction.name,
        hall_name:   booking.classEvent.hall.name,
      });

      try {
        await sendWhatsApp({ phone, body, clientId: booking.client.id, templateId: "reminder", refId: booking.id, wa: wa ?? { isOnline: false, gatewayId: null, apiToken: null } });
        results.reminders++;
      } catch (e) {
        results.errors.push(`reminder:${booking.id}: ${e}`);
      }
    }
  } else if (quiet && reminderTmpl?.isActive) {
    results.skippedQuiet++;
  }

  // ── 2. ЗАПРОС ОТЗЫВА ПОСЛЕ ВИЗИТА ─────────────────────────────
  if (reviewTmpl?.isActive && !quiet) {
    const minPast = subHours(now, 6);
    const maxPast = subHours(now, 2);

    const recentBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["ATTENDED", "CONFIRMED"] },
        classEvent: { startAt: { gte: minPast, lte: maxPast } },
        client: { notifyAll: true, phone: { not: "" } },
      },
      include: {
        client: { select: { id: true, firstName: true, phone: true } },
        classEvent: { include: { direction: { select: { name: true } } } },
      },
    });

    for (const booking of recentBookings) {
      const existing = await (prisma.whatsAppMessage as any).count({
        where: { templateId: "review_request", refId: booking.id },
      });
      if (existing > 0) continue;

      const phone = booking.client.phone.replace(/\D/g, "");
      if (!phone) continue;

      const body = fillTemplate(reviewTmpl.body, {
        client_name: booking.client.firstName,
        direction:   booking.classEvent.direction.name,
      });

      try {
        await sendWhatsApp({ phone, body, clientId: booking.client.id, templateId: "review_request", refId: booking.id, wa: wa ?? { isOnline: false, gatewayId: null, apiToken: null } });
        results.reviews++;
      } catch (e) {
        results.errors.push(`review:${booking.id}: ${e}`);
      }
    }
  }

  // ── 3. СКИДКА НА ПЕЧАТЬ (через 12 дней после фотосессии) ─────────
  if (printTmpl?.isActive && !quiet) {
    const dayStart = subDays(now, 12);
    const dayEnd   = subDays(now, 11);

    const pastBookings = await prisma.booking.findMany({
      where: {
        status: "ATTENDED",
        classEvent: { startAt: { gte: dayStart, lte: dayEnd } },
        client: { notifyAll: true, phone: { not: "" } },
      },
      include: {
        client: { select: { id: true, firstName: true, phone: true } },
      },
    });

    for (const booking of pastBookings) {
      const existing = await (prisma.whatsAppMessage as any).count({
        where: { templateId: "print_discount", refId: booking.id },
      });
      if (existing > 0) continue;

      const phone = booking.client.phone.replace(/\D/g, "");
      if (!phone) continue;

      const body = fillTemplate(printTmpl.body, {
        client_name: booking.client.firstName,
      });

      try {
        await sendWhatsApp({ phone, body, clientId: booking.client.id, templateId: "print_discount", refId: booking.id, wa: wa ?? { isOnline: false, gatewayId: null, apiToken: null } });
        results.printDiscounts++;
      } catch (e) {
        results.errors.push(`printDiscount:${booking.id}: ${e}`);
      }
    }
  }

  // ── 4. ПОЗДРАВЛЕНИЯ С ДНЕМ РОЖДЕНИЯ ──────────────────────────
  if (birthdayTmpl?.isActive) {
    if (quiet) {
      results.skippedQuiet++;
    } else {
      const todayMonth = now.getMonth() + 1;
      const todayDay   = now.getDate();
      const yearTag    = format(now, "yyyy");

      const clients = await prisma.client.findMany({
        where: {
          birthDate: { not: null },
          notifyAll: true,
          phone:     { not: "" },
        },
        select: { id: true, firstName: true, lastName: true, phone: true, birthDate: true },
      });

      const birthdayClients = clients.filter(c => {
        if (!c.birthDate) return false;
        const d = new Date(c.birthDate);
        return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
      });

      for (const client of birthdayClients) {
        const existing = await (prisma.whatsAppMessage as any).count({
          where: { templateId: "birthday", refId: `bday-${client.id}-${yearTag}` },
        });
        if (existing > 0) continue;

        const phone = client.phone.replace(/\D/g, "");
        if (!phone) continue;

        const body = fillTemplate(birthdayTmpl.body, {
          client_name: client.firstName,
        });

        try {
          await sendWhatsApp({
            phone, body, clientId: client.id,
            templateId: "birthday",
            refId: `bday-${client.id}-${yearTag}`,
            wa: wa ?? { isOnline: false, gatewayId: null, apiToken: null },
          });
          results.birthdays++;
        } catch (e) {
          results.errors.push(`birthday:${client.id}: ${e}`);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    quiet,
    quietHours: `${quietStart}:00–${quietEnd}:00`,
    ...results,
  });
}
