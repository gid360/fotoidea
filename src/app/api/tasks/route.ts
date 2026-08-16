import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhonePretty } from "@/app/conversations/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");
    const statusParam = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = session.user.id;

    const where: any = {};

    if (statusParam && ["PENDING", "DONE", "OVERDUE", "ARCHIVED"].includes(statusParam)) {
      where.status = statusParam;
    } else {
      where.status = { not: "ARCHIVED" };
    }

    if (scope === "mine") {
      where.assignedTo = { some: { id: userId } };
    } else if (scope === "assigned") {
      where.createdById = userId;
    }

    if (from || to) {
      where.dueAt = {};
      if (from) where.dueAt.gte = new Date(from);
      if (to) where.dueAt.lte = new Date(to);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const now = new Date();
    const formatted = tasks.map((t) => {
      let currentStatus = t.status;
      if (t.status === "PENDING" && t.dueAt && new Date(t.dueAt) < now) {
        currentStatus = "OVERDUE";
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        status: currentStatus,
        category: t.category || "general",
        assignedToIds: t.assignedTo.map((u) => u.id),
        assignedTo: t.assignedTo.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || "Сотрудник",
        })),
        createdBy: t.createdBy
          ? {
              id: t.createdBy.id,
              name: `${t.createdBy.firstName} ${t.createdBy.lastName}`.trim() || "Сотрудник",
            }
          : null,
        clientId: t.clientId,
        client: t.client
          ? {
              id: t.client.id,
              name: `${t.client.firstName} ${t.client.lastName}`.trim(),
              phone: formatPhonePretty(t.client.phone),
            }
          : null,
        createdAt: t.createdAt.toISOString(),
        attachments: Array.isArray(t.attachments) ? (t.attachments as any) : [],
        commentsCount: t._count.comments,
      };
    });

    return NextResponse.json({ tasks: formatted });
  } catch (e) {
    console.error("Error fetching tasks:", e);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
    }

    const assignedIds: string[] = Array.isArray(body.assignedToIds) ? body.assignedToIds : [];

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: body.status || "PENDING",
        category: body.category || "general",
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        createdById: session.user.id,
        clientId: body.clientId || null,
        assignedTo: {
          connect: assignedIds.map((id) => ({ id })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt ? task.dueAt.toISOString() : null,
        status: task.status,
        category: task.category,
        assignedToIds: task.assignedTo.map((u) => u.id),
        assignedTo: task.assignedTo.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || "Сотрудник",
        })),
        createdBy: task.createdBy
          ? {
              id: task.createdBy.id,
              name: `${task.createdBy.firstName} ${task.createdBy.lastName}`.trim() || "Сотрудник",
            }
          : null,
        clientId: task.clientId,
        client: task.client
          ? {
              id: task.client.id,
              name: `${task.client.firstName} ${task.client.lastName}`.trim(),
              phone: formatPhonePretty(task.client.phone),
            }
          : null,
        createdAt: task.createdAt.toISOString(),
        attachments: Array.isArray(task.attachments) ? (task.attachments as any) : [],
      },
    });
  } catch (e) {
    console.error("Error creating task:", e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
