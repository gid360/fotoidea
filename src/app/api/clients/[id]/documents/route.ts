import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docs = await prisma.clientDocument.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${id}-doc-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/documents/${filename}`;
  const doc = await prisma.clientDocument.create({
    data: {
      clientId:     id,
      filename,
      originalName: file.name,
      url,
      mimeType:     file.type || "image/jpeg",
      size:         file.size,
    },
  });

  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { docId } = await req.json();
  await prisma.clientDocument.delete({ where: { id: docId, clientId: id } });
  return NextResponse.json({ ok: true });
}
