import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskFormPage } from "../TaskFormPage";

export const metadata = {
  title: "Новая задача | Fotoidea CRM",
};

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return <TaskFormPage />;
}
