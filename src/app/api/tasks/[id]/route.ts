import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhonePretty } from "@/app/conversations/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
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

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    const now = new Date();
    let currentStatus = task.status;
    if (task.status === "PENDING" && task.dueAt && new Date(task.dueAt) < now) {
      currentStatus = "OVERDUE";
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt ? task.dueAt.toISOString() : null,
        status: currentStatus,
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
    console.error("Error fetching task:", e);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();

    const data: any = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.category !== undefined) data.category = body.category;
    if (body.clientId !== undefined) data.clientId = body.clientId || null;
    if (body.attachments !== undefined) data.attachments = body.attachments;

    if (Array.isArray(body.assignedToIds)) {
      data.assignedTo = {
        set: body.assignedToIds.map((uId: string) => ({ id: uId })),
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data,
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
    console.error("Error updating task:", e);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error deleting task:", e);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
