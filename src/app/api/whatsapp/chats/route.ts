import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEvolutionServerUrl } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });

  if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
    return NextResponse.json({ chats: [], message: "Evolution API not configured" });
  }

  const cleanServerUrl = getEvolutionServerUrl(wa.serverUrl);
  const url = `${cleanServerUrl}/chat/findChats/${wa.instanceName}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": wa.apiKey,
      },
      body: JSON.stringify({ limit: 100 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ chats: [], error: err?.message || `HTTP ${res.status}` });
    }

    const rawChats = await res.json();
    if (!Array.isArray(rawChats)) {
      return NextResponse.json({ chats: [] });
    }

    const phoneMap = new Map<string, any>();

    rawChats.forEach((c: any) => {
      if (c.remoteJid?.includes("@broadcast") || c.remoteJid?.includes("@g.us")) return;

      // Primary JID for API operations
      const exactJid = c.remoteJid || c.id || "";

      // Alt JID or phone number extraction
      let altJid = c.lastMessage?.key?.remoteJidAlt || c.remoteJid || c.id || "";
      if (altJid.includes("@lid") && c.lastMessage?.key?.remoteJidAlt) {
        altJid = c.lastMessage.key.remoteJidAlt;
      }

      let phone = altJid.split("@")[0].replace(/\D/g, "");
      if (!phone || phone.length > 12) {
        phone = exactJid.split("@")[0].replace(/\D/g, "");
      }

      // Ignore internal LIDs if no valid phone number
      if (!phone || phone.length > 12) return;

      const msg = c.lastMessage?.message;
      let text = msg?.conversation || msg?.extendedTextMessage?.text || "";
      if (!text && msg?.audioMessage) text = "🎤 Голосовое сообщение";
      if (!text && msg?.imageMessage) text = "📷 Фотография";
      if (!text && msg?.documentMessage) text = "📄 Документ (" + (msg.documentMessage.fileName || "файл") + ")";
      if (!text && msg?.stickerMessage) text = "Sticker";
      if (!text && c.lastMessage?.messageType) text = `[${c.lastMessage.messageType}]`;

      const ts = c.lastMessage?.messageTimestamp
        ? c.lastMessage.messageTimestamp * 1000
        : new Date(c.updatedAt || 0).getTime();

      const name = (c.pushName && !c.pushName.match(/^\d+$/))
        ? c.pushName
        : (c.lastMessage?.pushName && !c.lastMessage.pushName.match(/^\d+$/))
        ? c.lastMessage.pushName
        : `+${phone}`;

      const chatObj = {
        id: exactJid,
        remoteJid: exactJid,
        phone,
        name,
        profilePicUrl: c.profilePicUrl || null,
        unreadCount: c.unreadCount || 0,
        updatedAt: new Date(ts).toISOString(),
        timestamp: ts,
        lastMessage: text || "Сообщение",
        fromMe: c.lastMessage?.key?.fromMe ?? false,
      };

      // Keep entry with newest timestamp per clean phone number
      if (!phoneMap.has(phone) || phoneMap.get(phone).timestamp < ts) {
        phoneMap.set(phone, chatObj);
      }
    });

    const chats = Array.from(phoneMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ chats });
  } catch (e) {
    console.error("Error fetching chats from Evolution API:", e);
    return NextResponse.json(
      { chats: [], error: e instanceof Error ? e.message : "Error fetching chats" },
      { status: 500 }
    );
  }
}
