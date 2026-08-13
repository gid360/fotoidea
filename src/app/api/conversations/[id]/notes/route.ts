import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const phone = id.split("@")[0].replace(/\D/g, "");
  let client = await prisma.client.findFirst({
    where: { phone: { contains: phone.slice(-10) } },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName: "Клиент",
        lastName: "",
        phone: phone.startsWith("7") || phone.startsWith("8") ? `+7${phone.slice(-10)}` : `+${phone}`,
      },
    });
  }

  // Parse existing notes
  let notes: any[] = [];
  if (client.note) {
    try {
      notes = JSON.parse(client.note);
      if (!Array.isArray(notes)) notes = [];
    } catch {
      notes = client.note.split("\n").filter(Boolean).map((line, idx) => ({
        id: `legacy-${idx}`,
        text: line.trim(),
        createdAt: client!.createdAt.toISOString(),
        author: { name: "Менеджер" },
      }));
    }
  }

  const authorName = session.user.name || "Менеджер";
  const newNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    author: { name: authorName },
  };

  notes.unshift(newNote);

  await prisma.client.update({
    where: { id: client.id },
    data: { note: JSON.stringify(notes) },
  });

  return NextResponse.json(newNote);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");

  if (!noteId) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }

  const phone = id.split("@")[0].replace(/\D/g, "");
  const client = await prisma.client.findFirst({
    where: { phone: { contains: phone.slice(-10) } },
  });

  if (!client || !client.note) {
    return NextResponse.json({ ok: true });
  }

  let notes: any[] = [];
  try {
    notes = JSON.parse(client.note);
    if (!Array.isArray(notes)) notes = [];
  } catch {
    notes = client.note.split("\n").filter(Boolean).map((line, idx) => ({
      id: `legacy-${idx}`,
      text: line.trim(),
      createdAt: client.createdAt.toISOString(),
      author: { name: "Менеджер" },
    }));
  }

  notes = notes.filter((n: any) => n.id !== noteId);

  await prisma.client.update({
    where: { id: client.id },
    data: { note: JSON.stringify(notes) },
  });

  return NextResponse.json({ ok: true });
}
