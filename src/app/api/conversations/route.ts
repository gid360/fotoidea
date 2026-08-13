import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch Evolution API chats & phonebook contacts if configured
  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  let evolutionChats: any[] = [];
  let evolutionContacts: any[] = [];

  if (wa && wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
    try {
      const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
      const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

      const [chatsRes, contactsRes] = await Promise.all([
        fetch(`${cleanServerUrl}/chat/findChats/${wa.instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ limit: 100 }),
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${cleanServerUrl}/chat/findContacts/${wa.instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
      ]);

      if (chatsRes.ok) {
        const raw = await chatsRes.json();
        if (Array.isArray(raw)) evolutionChats = raw;
      }

      if (contactsRes && contactsRes.ok) {
        const rawCt = await contactsRes.json();
        if (Array.isArray(rawCt)) evolutionContacts = rawCt;
      }
    } catch (e) {
      console.error("Failed to fetch Evolution data in conversations route:", e);
    }
  }

  // Build contact book map from Evolution API
  const contactBook = new Map<string, string>();
  evolutionContacts.forEach((ct: any) => {
    const rawJid = ct.remoteJid || ct.id || "";
    const p = rawJid.split("@")[0].replace(/\D/g, "");
    const name = ct.pushName || ct.name || ct.verifiedName;
    if (p && name && !name.match(/^\d+$/) && name !== "Você") {
      contactBook.set(p, name);
    }
  });

  // 2. Fetch clients and leads from local DB
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const leads = await prisma.lead.findMany();

  const phoneMap = new Map<string, any>();

  // Process Evolution chats
  evolutionChats.forEach((c: any) => {
    if (c.remoteJid?.includes("@broadcast") || c.remoteJid?.includes("@g.us")) return;

    const exactJid = c.remoteJid || c.id || "";
    let altJid = c.lastMessage?.key?.remoteJidAlt || c.remoteJid || c.id || "";
    if (altJid.includes("@lid") && c.lastMessage?.key?.remoteJidAlt) {
      altJid = c.lastMessage.key.remoteJidAlt;
    }

    let phone = altJid.split("@")[0].replace(/\D/g, "");
    if (!phone || phone.length < 10 || phone.length > 12) {
      phone = exactJid.split("@")[0].replace(/\D/g, "");
    }

    // Ignore internal LIDs that have no real phone number
    if (!phone || phone.length < 10 || phone.length > 12) return;

    const msg = c.lastMessage?.message;
    let text = msg?.conversation || msg?.extendedTextMessage?.text || "";
    if (!text && msg?.audioMessage) text = "🎤 Голосовое сообщение";
    if (!text && msg?.imageMessage) text = "📷 Фотография";
    if (!text && msg?.documentMessage) text = "📄 Документ (" + (msg.documentMessage.fileName || "файл") + ")";
    if (!text && msg?.stickerMessage) text = "Sticker";

    const ts = c.lastMessage?.messageTimestamp
      ? new Date(c.lastMessage.messageTimestamp * 1000).toISOString()
      : (c.updatedAt || new Date().toISOString());

    // Contact name resolution chain: DB Client -> DB Lead -> Contact Book -> Chat PushName
    const pushName = (c.pushName && !c.pushName.match(/^\d+$/) && c.pushName !== "Você")
      ? c.pushName
      : (c.lastMessage?.pushName && !c.lastMessage.pushName.match(/^\d+$/) && c.lastMessage.pushName !== "Você")
      ? c.lastMessage.pushName
      : null;

    const last10 = phone.slice(-10);
    const dbClient = clients.find((cli) => {
      const p = (cli.phone || "").replace(/\D/g, "");
      return p === phone || (p.length >= 10 && last10.length >= 10 && p.slice(-10) === last10);
    });
    const dbLead = leads.find((l) => {
      if (!l.phone) return false;
      const p = l.phone.replace(/\D/g, "");
      return p === phone || (p.length >= 10 && last10.length >= 10 && p.slice(-10) === last10);
    });

    let displayName = dbClient?.firstName
      ? `${dbClient.firstName} ${dbClient.lastName || ""}`.trim()
      : (dbLead?.name || contactBook.get(phone) || pushName || null);
    if (displayName && (
      displayName.toLowerCase() === "fotoidea" ||
      displayName.includes("@c.us") ||
      displayName.includes("@g.us") ||
      /^[+\d\s().-]+$/.test(displayName)
    )) {
      displayName = null;
    }

    const isPinned = Boolean(
      c.pinned || c.isPinned || c.pin || (typeof c.pinnedTimestamp === "number" && c.pinnedTimestamp > 0)
    );

    const item = {
      id: exactJid,
      clientId: dbClient?.id || exactJid,
      remoteJid: exactJid,
      funnelStageId: dbLead?.status || "NEW",
      assignedAdminId: null,
      status: "OPEN",
      lastMessageAt: ts,
      unreadCount: c.unreadCount || 0,
      isPinned,
      client: {
        id: dbClient?.id || exactJid,
        phone,
        name: displayName,
        segment: dbClient?.loyaltyTag === "NEW" ? "NEW" : dbClient?.loyaltyTag === "LOST" ? "FORMER" : "ACTIVE",
        lastVisitAt: dbClient?.lastVisit ? dbClient.lastVisit.toISOString() : null,
        channel: "WHATSAPP",
        avatarUrl: c.profilePicUrl || dbClient?.photoUrl || null,
        source: dbLead?.source || "WHATSAPP",
        note: dbClient?.note || dbLead?.note || null,
      },
      funnelStage: {
        id: dbLead?.status || "NEW",
        name: dbLead?.status === "IN_PROGRESS" ? "В работе" : dbLead?.status === "SUCCESS" ? "Успешно" : dbLead?.status === "REJECTED" ? "Отказ" : "Новый лид",
        order: 1,
        color: dbLead?.status === "SUCCESS" ? "#22c55e" : dbLead?.status === "REJECTED" ? "#ef4444" : "#3b82f6",
      },
      assignedAdmin: null,
      messages: [
        {
          id: c.lastMessage?.id || Math.random().toString(),
          conversationId: exactJid,
          direction: c.lastMessage?.key?.fromMe ? "OUTGOING" : "INCOMING",
          text: text || "Сообщение",
          mediaUrl: null,
          fileName: null,
          status: "SENT",
          createdAt: ts,
          author: null,
        },
      ],
    };

    if (!phoneMap.has(phone) || new Date(phoneMap.get(phone).lastMessageAt).getTime() < new Date(ts).getTime()) {
      const existing = phoneMap.get(phone);
      if (existing && existing.isPinned) {
        item.isPinned = true;
      }
      phoneMap.set(phone, item);
    }
  });

  const result = Array.from(phoneMap.values()).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  return NextResponse.json(result);
}
