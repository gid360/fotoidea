import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? 14), 30);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const until = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const [halls, services, directions, events, studio] = await Promise.all([
    prisma.hall.findMany({
      where: { isActive: true, showInSchedule: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { halls: { select: { id: true, name: true, colorHex: true } } },
    }),
    prisma.trainingDirection.findMany({
      where: { isActive: true },
      select: { id: true, name: true, colorHex: true, icon: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.classEvent.findMany({
      where: {
        startAt: { gte: today, lt: until },
      },
      include: {
        direction: { select: { name: true, colorHex: true } },
        trainer: { select: { user: { select: { firstName: true, lastName: true } } } },
        hall: { select: { id: true, name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.setting.findMany({
      where: { key: { in: ["studioName", "studioPhone", "studioAddress", "logoUrl"] } },
    }),
  ]);

  const settings = Object.fromEntries(studio.map(s => [s.key, s.value]));

  // Build list of free time slots per hall per day based on hall operating hours (openTime - closeTime)
  const availableSlots: Array<{
    id: string;
    hallId: string;
    hallName: string;
    colorHex: string;
    date: string;
    time: string;
    startAt: string;
    durationMin: number;
  }> = [];

  for (let d = 0; d < days; d++) {
    const slotDateObj = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
    const dateStr = slotDateObj.toISOString().split("T")[0]; // YYYY-MM-DD

    for (const hall of halls) {
      const openHour = parseInt((hall.openTime || "09:00").split(":")[0], 10);
      const closeHour = parseInt((hall.closeTime || "21:00").split(":")[0], 10);

      const startH = isNaN(openHour) ? 9 : openHour;
      const endH = isNaN(closeHour) ? 21 : closeHour;

      for (let h = startH; h < endH; h++) {
        const slotStart = new Date(slotDateObj);
        slotStart.setHours(h, 0, 0, 0);

        if (slotStart < now) continue; // Skip past slots

        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        // Check if slot overlaps with any existing ClassEvent in this hall
        const isOccupied = events.some(e => {
          if (e.hallId !== hall.id) return false;
          const evStart = new Date(e.startAt);
          const evEnd = new Date(evStart.getTime() + (e.durationMin || 60) * 60 * 1000);
          return slotStart < evEnd && slotEnd > evStart;
        });

        if (!isOccupied) {
          const timeStr = `${String(h).padStart(2, "0")}:00`;
          availableSlots.push({
            id: `${hall.id}-${dateStr}-${timeStr}`,
            hallId: hall.id,
            hallName: hall.name,
            colorHex: hall.colorHex,
            date: dateStr,
            time: timeStr,
            startAt: slotStart.toISOString(),
            durationMin: 60,
          });
        }
      }
    }
  }

  return NextResponse.json({
    settings,
    halls,
    services,
    directions,
    availableSlots,
    events: events.map(e => ({
      id: e.id,
      startAt: e.startAt,
      durationMin: e.durationMin,
      directionName: e.direction.name,
      colorHex: e.direction.colorHex,
      trainerName: e.trainer ? `${e.trainer.user.firstName} ${e.trainer.user.lastName}` : "Аренда",
      hallId: e.hall.id,
      hallName: e.hall.name,
    })),
  });
}
