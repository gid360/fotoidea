import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { remoteJid, messageId, fromMe, reaction } = await req.json();

    if (!remoteJid || !messageId) {
      return NextResponse.json({ error: "remoteJid and messageId are required" }, { status: 400 });
    }

    const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
    if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.apiKey || !wa.instanceName) {
      return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
    }

    const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");

    const payload = {
      key: {
        remoteJid,
        fromMe: Boolean(fromMe),
        id: messageId,
      },
      reaction: reaction || "",
    };

    const res = await fetch(`${cleanServerUrl}/message/sendReaction/${wa.instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: wa.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Evolution API reaction error:", res.status, errText);
      return NextResponse.json({ error: "Failed to send reaction to WhatsApp" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("Error in /api/whatsapp/reaction:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
