import { LoyaltyTag } from "@prisma/client";

export interface ClientLoyaltyInput {
  createdAt?: Date | string | null;
  firstVisit?: Date | string | null;
  lastVisit?: Date | string | null;
  bookingsCount?: number;
  bookings?: Array<{
    createdAt?: Date | string;
    status?: string;
    classEvent?: {
      startAt?: Date | string | null;
    } | null;
  }>;
}

export const LOYALTY_CONFIG: Record<
  LoyaltyTag,
  { label: string; className: string; badgeVariant?: string; color: string; description: string }
> = {
  NEW: {
    label: "Новый",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    color: "#2563eb",
    description: "В базе до 30 дней",
  },
  ACTIVE: {
    label: "Действующий",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    color: "#059669",
    description: "В базе > 30 дней, от 2 заказанных услуг",
  },
  REGULAR: {
    label: "Постоянный",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
    color: "#7c3aed",
    description: "Более 3 заказанных услуг",
  },
  LOST: {
    label: "Потерянный",
    className: "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-800",
    color: "#dc2626",
    description: "Не заказывал услуги более 250 дней",
  },
};

/**
 * Градация клиентов:
 * - Новый: не в базе или в базе не более 30 дней с момента добавления
 * - Действующий: в базе более 30 дней и имеет минимум заказанную услугу 2 шт
 * - Постоянный: более 3 шт заказанных услуг
 * - Потерянный: не заказывал услуги более 250 дней
 */
export function calculateClientLoyaltyTag(client: ClientLoyaltyInput): LoyaltyTag {
  const now = new Date();
  const createdAt = client.createdAt ? new Date(client.createdAt) : now;
  const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Считаем заказанные услуги (исключая отмененные записи)
  const validBookings = client.bookings
    ? client.bookings.filter((b) => b.status !== "CANCELLED")
    : [];

  const ordersCount = typeof client.bookingsCount === "number"
    ? client.bookingsCount
    : (client.bookings ? validBookings.length : 0);

  // Находим дату последней заказанной услуги
  let lastServiceDate: Date | null = null;
  if (client.lastVisit) {
    const lv = new Date(client.lastVisit);
    if (!isNaN(lv.getTime())) {
      lastServiceDate = lv;
    }
  }

  if (validBookings.length > 0) {
    for (const b of validBookings) {
      const d = b.classEvent?.startAt ? new Date(b.classEvent.startAt) : (b.createdAt ? new Date(b.createdAt) : null);
      if (d && !isNaN(d.getTime())) {
        if (!lastServiceDate || d.getTime() > lastServiceDate.getTime()) {
          lastServiceDate = d;
        }
      }
    }
  }

  // Дней с момента последней услуги
  const referenceDate = lastServiceDate || createdAt;
  const daysSinceLastService = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  // 1. Потерянный — не заказывал услуги более 250 дней
  // (либо последняя услуга была > 250 дней назад, либо клиент в базе > 250 дней и ни разу не заказывал)
  if (daysSinceLastService > 250) {
    return LoyaltyTag.LOST;
  }

  // 2. Постоянный — более 3 шт заказанных услуг (4 и более)
  if (ordersCount > 3) {
    return LoyaltyTag.REGULAR;
  }

  // 3. Действующий — в базе более 30 дней и имеет минимум заказанную услугу 2 шт (2 или 3 шт)
  if (daysSinceCreated > 30 && ordersCount >= 2) {
    return LoyaltyTag.ACTIVE;
  }

  // 4. Новый — не в базе или в базе не более 30 дней (или еще не набрал 2 услуги и не потерян)
  return LoyaltyTag.NEW;
}
