import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "tasks");
    await mkdir(uploadDir, { recursive: true });

    const originalName = file.name || "file";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/tasks/${filename}`;
    return NextResponse.json({ name: originalName, url });
  } catch (e) {
    console.error("Error uploading task attachment:", e);
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
