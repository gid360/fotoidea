import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { id: "general", name: "Общие", color: "#64748b", sortOrder: 0 },
  { id: "marketing", name: "Маркетинг", color: "#8b5cf6", sortOrder: 1 },
  { id: "sales", name: "Продажи", color: "#10b981", sortOrder: 2 },
  { id: "clients", name: "Клиенты", color: "#3b82f6", sortOrder: 3 },
  { id: "shooting", name: "Съемка", color: "#ec4899", sortOrder: 4 },
  { id: "urgent", name: "Срочно", color: "#ef4444", sortOrder: 5 },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let categories = await prisma.taskCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    if (categories.length === 0) {
      // Seed default categories
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.taskCategory.upsert({
          where: { id: cat.id },
          create: cat,
          update: {},
        });
      }
      categories = await prisma.taskCategory.findMany({
        orderBy: { sortOrder: "asc" },
      });
    }

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("Error fetching task categories:", e);
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Название категории обязательно" }, { status: 400 });
    }

    const count = await prisma.taskCategory.count();
    const category = await prisma.taskCategory.create({
      data: {
        name: body.name.trim(),
        color: body.color || "#64748b",
        sortOrder: count,
      },
    });

    return NextResponse.json({ category });
  } catch (e) {
    console.error("Error creating category:", e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
