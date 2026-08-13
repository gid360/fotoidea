import { prisma } from "@/lib/prisma";
import { WidgetClient } from "@/app/widget/WidgetClient";

export const revalidate = 0;

// Public booking page — no auth required
export default async function BookPage() {
  const studioSettings = await prisma.setting.findMany({
    where: { key: { in: ["studioName", "studioPhone", "studioAddress", "logoUrl"] } },
  }).catch(() => []);

  const initialSettings = Object.fromEntries(studioSettings.map(s => [s.key, s.value]));

  return <WidgetClient initialSettings={initialSettings} />;
}
