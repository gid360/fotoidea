import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { remoteJid, messageId, text } = await req.json();
    if (!remoteJid || !messageId || !text) {
      return NextResponse.json({ error: "Укажите remoteJid, messageId и text" }, { status: 400 });
    }

    const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
    if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
      return NextResponse.json({ error: "Evolution API не настроен" }, { status: 400 });
    }

    const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
    const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

    let phone = remoteJid.split("@")[0].replace(/\D/g, "");

    // Try Evolution API updateMessage endpoint first
    let res = await fetch(`${cleanServerUrl}/chat/updateMessage/${wa.instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: phone,
        text,
        key: {
          remoteJid,
          fromMe: true,
          id: messageId,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      // Fallback to /message/edit endpoint
      res = await fetch(`${cleanServerUrl}/message/edit/${wa.instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: phone,
          text,
          key: {
            remoteJid,
            fromMe: true,
            id: messageId,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err?.message || err?.response?.message || "Ошибка редактирования в WhatsApp" }, { status: res.status || 500 });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("Error editing message:", e);
    return NextResponse.json({ error: e.message || "Ошибка сервера" }, { status: 500 });
  }
}
