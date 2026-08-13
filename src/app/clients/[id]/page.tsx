import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientDetail } from "./ClientDetail";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user?.role === "PHOTOGRAPHER") redirect("/schedule");
  const { id } = await params;
  return <div className="overflow-auto h-screen"><ClientDetail clientId={id} /></div>;
}
