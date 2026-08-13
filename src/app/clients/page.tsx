import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientsClient } from "./ClientsClient";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user?.role === "PHOTOGRAPHER") redirect("/schedule");
  return <div className="flex flex-col h-screen overflow-hidden"><ClientsClient /></div>;
}
