import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TasksClient } from "./TasksClient";

export const metadata = {
  title: "Задачи | Fotoidea CRM",
};

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return <TasksClient />;
}
