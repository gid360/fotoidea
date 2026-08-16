import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Для роли Администратора раздел Аналитика недоступен
  if (session.user.role !== "SUPERADMIN") {
    redirect("/conversations");
  }

  return <AnalyticsClient />;
}
