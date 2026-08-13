import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const clientId = formData.get("clientId") as string;

  if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), "public", "uploads", "clients");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${clientId}-${Date.now()}.${ext}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);

  const url = `/uploads/clients/${filename}`;
  return NextResponse.json({ url });
}
