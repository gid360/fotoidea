import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const entries = Object.entries(body);
    for (const [key, val] of entries) {
      if (typeof key === "string") {
        const stringVal = val === null || val === undefined ? "" : String(val);
        await prisma.setting.upsert({
          where: { key },
          create: { key, value: stringVal },
          update: { value: stringVal },
        });
      }
    }

    const all = await prisma.setting.findMany();
    const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
    return NextResponse.json({ ok: true, settings: map });
  } catch (e: any) {
    console.error("Error saving settings:", e);
    return NextResponse.json({ error: e.message || "Failed to save settings" }, { status: 500 });
  }
}
