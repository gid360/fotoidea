import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEvolutionServerUrl } from "@/lib/whatsapp";

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

  const cleanServerUrl = getEvolutionServerUrl(wa.serverUrl);
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
    const queries: any[] = [{ key: { remoteJid: targetJid } }];
    const queriedKeys = new Set<string>([`remoteJid:${targetJid}`]);

    if (phone && phone.length >= 10) {
      const last10 = phone.slice(-10);
      const candidates = [
        `${phone}@s.whatsapp.net`,
        `7${last10}@s.whatsapp.net`,
        `8${last10}@s.whatsapp.net`,
      ];
      for (const cJid of candidates) {
        if (!queriedKeys.has(`remoteJid:${cJid}`)) {
          queriedKeys.add(`remoteJid:${cJid}`);
          queries.push({ key: { remoteJid: cJid } });
        }
        if (!queriedKeys.has(`remoteJidAlt:${cJid}`)) {
          queriedKeys.add(`remoteJidAlt:${cJid}`);
          queries.push({ key: { remoteJidAlt: cJid } });
        }
      }
    }

    const fetchResults = await Promise.all(
      queries.map(async (where) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ where, limit: 100 }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const data = await res.json();
            return data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
          }
        } catch (err) {}
        return [];
      })
    );

    const rawMsgsMap = new Map<string, any>();
    const extraJids: string[] = [];

    for (const list of fetchResults) {
      if (Array.isArray(list)) {
        for (const m of list) {
          const mId = m.key?.id || m.id;
          if (mId && !rawMsgsMap.has(mId)) {
            rawMsgsMap.set(mId, m);
          }
          if (m.key?.remoteJid && !queriedKeys.has(`remoteJid:${m.key.remoteJid}`)) {
            queriedKeys.add(`remoteJid:${m.key.remoteJid}`);
            extraJids.push(m.key.remoteJid);
          }
        }
      }
    }

    if (extraJids.length > 0) {
      const extraResults = await Promise.all(
        extraJids.map(async (jid) => {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 100 }),
              signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
              const data = await res.json();
              return data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
            }
          } catch (err) {}
          return [];
        })
      );
      for (const list of extraResults) {
        if (Array.isArray(list)) {
          for (const m of list) {
            const mId = m.key?.id || m.id;
            if (mId && !rawMsgsMap.has(mId)) {
              rawMsgsMap.set(mId, m);
            }
          }
        }
      }
    }

    const rawMsgs = Array.from(rawMsgsMap.values());

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
