import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { firstName: "asc" },
    });

    const items = users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim() || "Сотрудник",
      role: u.role,
      avatarUrl: u.avatarUrl,
    }));

    return NextResponse.json({ users: items });
  } catch (e) {
    console.error("Error fetching assignable users:", e);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
