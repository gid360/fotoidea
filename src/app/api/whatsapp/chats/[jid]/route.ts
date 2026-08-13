import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jid: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jid } = await params;
  const decodedJid = decodeURIComponent(jid);

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
    return NextResponse.json({ messages: [] });
  }

  const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
  const url = `${cleanServerUrl}/chat/findMessages/${wa.instanceName}`;
  const headers = {
    "Content-Type": "application/json",
    "apikey": wa.apiKey,
  };

  let targetJid = decodedJid;
  if (!targetJid.includes("@")) {
    targetJid = `${targetJid}@s.whatsapp.net`;
  }

  const phone = targetJid.split("@")[0].replace(/\D/g, "");

  try {
    // 1. First try targetJid
    let res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        where: { key: { remoteJid: targetJid } },
        limit: 50,
      }),
      signal: AbortSignal.timeout(8000),
    });

    let rawMsgs: any[] = [];
    if (res.ok) {
      const data = await res.json();
      rawMsgs = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
    }

    // 2. If no messages found and phone is available, fallback to phone@s.whatsapp.net
    if ((!Array.isArray(rawMsgs) || rawMsgs.length === 0) && phone && phone.length <= 12) {
      const altJid = `${phone}@s.whatsapp.net`;
      if (altJid !== targetJid) {
        res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            where: { key: { remoteJid: altJid } },
            limit: 50,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          rawMsgs = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
        }
      }
    }

    if (!Array.isArray(rawMsgs)) {
      return NextResponse.json({ messages: [] });
    }

    const messages = rawMsgs
      .map((m: any) => {
        const msg = m.message;
        let text = msg?.conversation || msg?.extendedTextMessage?.text || "";
        if (!text && msg?.audioMessage) text = "🎤 Голосовое сообщение";
        if (!text && msg?.imageMessage) text = "📷 Фотография";
        if (!text && msg?.documentMessage) text = "📄 Документ: " + (msg.documentMessage.fileName || "файл");
        if (!text && msg?.stickerMessage) text = "Sticker";
        if (!text && m.messageType) text = `[${m.messageType}]`;

        const ts = m.messageTimestamp
          ? new Date(m.messageTimestamp * 1000).toISOString()
          : (m.createdAt || new Date().toISOString());

        return {
          id: m.id || m.key?.id || Math.random().toString(),
          fromMe: m.key?.fromMe ?? false,
          text: text || "",
          timestamp: ts,
          status: m.status || "SENT",
          pushName: m.pushName || null,
        };
      })
      .reverse();

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Error fetching chat messages:", e);
    return NextResponse.json({ messages: [] });
  }
}
