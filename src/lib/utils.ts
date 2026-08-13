import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string | { toString(): string }) {
  return Number(amount).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Normalize KZ/RU phone: 8XXXXXXXXXX → +7XXXXXXXXXX
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    return "+7" + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith("7")) {
    return "+7" + digits.slice(1);
  }
  // Already has +7 or other format — return trimmed original
  return phone.trim();
}

export function formatDuration(min: number): string {
  if (!min || min <= 0) return "Не показывать";
  if (min === 60) return "1 час";
  if (min === 120) return "2 часа";
  if (min === 180) return "3 часа";
  if (min % 60 === 0) return `${min / 60} ч`;
  return `${min} мин`;
}

export interface PriceTier {
  minPeople: number;
  maxPeople?: number | null;
  pricePerPerson: number;
}

export function calcExtraPeopleFee(
  serviceName: string,
  peopleCount: number,
  isRent: boolean,
  hallName?: string,
  includedPeopleCount?: number,
  isPerPerson?: boolean,
  basePrice: number = 0,
  priceTiers?: PriceTier[] | null
): { fee: number; ruleText: string } {
  const sName = (serviceName || "").toLowerCase();
  const hName = (hallName || "").toLowerCase();
  const count = Math.max(1, peopleCount);

  // 1. Tiered Pricing per Person (e.g., School Photoshoot per-person count ranges)
  if (priceTiers && Array.isArray(priceTiers) && priceTiers.length > 0) {
    const sortedTiers = [...priceTiers].sort((a, b) => a.minPeople - b.minPeople);
    const matchedTier = sortedTiers.find(t => {
      if (t.maxPeople && t.maxPeople > 0) {
        return count >= t.minPeople && count <= t.maxPeople;
      }
      return count >= t.minPeople;
    }) || sortedTiers[sortedTiers.length - 1];

    if (matchedTier) {
      const tierPrice = matchedTier.pricePerPerson;
      const totalTierPrice = count * tierPrice;
      const fee = totalTierPrice - basePrice;
      return {
        fee,
        ruleText: `${serviceName}: ${formatMoney(tierPrice)} ₸/чел. (${count} чел. × ${formatMoney(tierPrice)} ₸)`,
      };
    }
  }

  // Check if per person pricing applies (school shoots, big family packages, or explicit isPerPerson)
  const isPerPersonService = Boolean(
    isPerPerson ||
    sName.includes("школьн") ||
    sName.includes("большая семья") ||
    sName.includes("семья большая")
  );

  if (isPerPersonService && basePrice > 0) {
    const fee = (count - 1) * basePrice;
    const rulePrefix = sName.includes("школьн")
      ? "Школьная съемка"
      : (sName.includes("большая семья") || sName.includes("семья большая"))
        ? "Пакет Большая семья"
        : serviceName;

    return {
      fee,
      ruleText: `${rulePrefix}: ${formatMoney(basePrice)} ₸ за каждого человека (${count} чел. × ${formatMoney(basePrice)} ₸)`,
    };
  }

  // Check if this is pure hall rent
  const isRentService = sName.includes("аренда") || isRent;
  const isBigHall = hName.includes("большой") || sName.includes("большой");
  const isSmallHall = hName.includes("малый") || sName.includes("малый");

  if (isRentService) {
    if (isBigHall) {
      const fee = count > 10 ? (count - 10) * 1000 : 0;
      return {
        fee,
        ruleText: "Аренда Большого зала: до 10 чел. включено, свыше - 1 000 ₸/чел.",
      };
    }

    if (isSmallHall) {
      const fee = count > 6 ? (count - 6) * 1000 : 0;
      return {
        fee,
        ruleText: "Аренда Малого зала: до 6 чел. включено, свыше - 1 000 ₸/чел.",
      };
    }

    const fee = count > 6 ? (count - 6) * 1000 : 0;
    return {
      fee,
      ruleText: "Аренда зала: до 6 чел. включено, свыше - 1 000 ₸/чел.",
    };
  }

  // --- Photoshoot / Standard Service Package Logic ---
  const included = includedPeopleCount && includedPeopleCount > 0 ? includedPeopleCount : 5;
  const extraFeePerPerson = 2000;

  const fee = count > included ? (count - included) * extraFeePerPerson : 0;
  return {
    fee,
    ruleText: `${serviceName}: до ${included} чел. включено в пакет, свыше - ${formatMoney(extraFeePerPerson)} ₸/чел.`,
  };
}
