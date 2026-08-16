import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Для роли Администратора раздел Главная недоступен
  if (session.user.role === "ADMIN") {
    redirect("/conversations");
  }

  if (session.user.role === "TRAINER" || session.user.role === "PHOTOGRAPHER") {
    redirect("/schedule");
  }

  return <DashboardClient />;
}
