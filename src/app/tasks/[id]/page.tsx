import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskFormPage } from "../TaskFormPage";

export const metadata = {
  title: "Редактирование задачи | Fotoidea CRM",
};

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  return <TaskFormPage taskId={id} />;
}
