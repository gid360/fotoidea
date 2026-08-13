import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "./ScheduleClient";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const hallsRaw = await prisma.hall.findMany({
    where: { isActive: true, showInSchedule: true },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  const halls = JSON.parse(JSON.stringify(hallsRaw));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ScheduleClient initialHalls={halls} />
    </div>
  );
}
