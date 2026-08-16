import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const items = comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: `${c.author.firstName} ${c.author.lastName}`.trim() || "Сотрудник",
      authorAvatar: c.author.avatarUrl,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      parentId: c.parentId,
    }));

    return NextResponse.json({ comments: items });
  } catch (e) {
    console.error("Error fetching comments:", e);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Текст комментария обязателен" }, { status: 400 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        authorId: session.user.id,
        text: body.text.trim(),
        parentId: body.parentId || null,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        authorId: comment.authorId,
        authorName: `${comment.author.firstName} ${comment.author.lastName}`.trim() || "Сотрудник",
        authorAvatar: comment.author.avatarUrl,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
        parentId: comment.parentId,
      },
    });
  } catch (e) {
    console.error("Error adding comment:", e);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const commentId = url.searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error deleting comment:", e);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
