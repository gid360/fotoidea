import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-memory cache for fast response and resilience against temporary network/Evo hiccups
let cachedChats: any[] = [];
let cachedContacts: any[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 6000; // 6 seconds

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });

  let evolutionChats = cachedChats;
  let evolutionContacts = cachedContacts;

  if (wa && wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
    if (now - lastFetchTime > CACHE_TTL || cachedChats.length === 0) {
      try {
        const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
        const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

        const [chatsRes, contactsRes] = await Promise.all([
          fetch(`${cleanServerUrl}/chat/findChats/${wa.instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ limit: 100 }),
            signal: AbortSignal.timeout(6000),
          }),
          fetch(`${cleanServerUrl}/chat/findContacts/${wa.instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(6000),
          }).catch(() => null),
        ]);

        if (chatsRes.ok) {
          const raw = await chatsRes.json();
          if (Array.isArray(raw) && raw.length > 0) {
            cachedChats = raw;
            evolutionChats = raw;
            lastFetchTime = now;
          }
        }

        if (contactsRes && contactsRes.ok) {
          const rawCt = await contactsRes.json();
          if (Array.isArray(rawCt) && rawCt.length > 0) {
            cachedContacts = rawCt;
            evolutionContacts = rawCt;
          }
        }
      } catch (e) {
        console.error("Evolution fetch warning (using cached data):", e instanceof Error ? e.message : e);
      }
    }
  }

  // Fast contact book map
  const contactBook = new Map<string, string>();
  evolutionContacts.forEach((ct: any) => {
    const rawJid = ct.remoteJid || ct.id || "";
    const p = rawJid.split("@")[0].replace(/\D/g, "");
    const name = ct.pushName || ct.name || ct.verifiedName;
    if (p && name && !name.match(/^\d+$/) && name !== "Você") {
      contactBook.set(p, name);
      if (p.length >= 10) {
        contactBook.set(p.slice(-10), name);
      }
    }
  });

  // Fetch only necessary client fields and index by last 10 digits for O(1) instant lookup
  const [clients, leads] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        loyaltyTag: true,
        lastVisit: true,
        photoUrl: true,
        note: true,
      },
    }),
    prisma.lead.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        source: true,
        note: true,
      },
    }),
  ]);

  const clientByPhone = new Map<string, typeof clients[0]>();
  for (const c of clients) {
    if (c.phone) {
      const digits = c.phone.replace(/\D/g, "");
      if (digits) {
        clientByPhone.set(digits, c);
        if (digits.length >= 10) {
          clientByPhone.set(digits.slice(-10), c);
        }
      }
    }
  }

  const leadByPhone = new Map<string, typeof leads[0]>();
  for (const l of leads) {
    if (l.phone) {
      const digits = l.phone.replace(/\D/g, "");
      if (digits) {
        leadByPhone.set(digits, l);
        if (digits.length >= 10) {
          leadByPhone.set(digits.slice(-10), l);
        }
      }
    }
  }

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

    const pushName = (c.pushName && !c.pushName.match(/^\d+$/) && c.pushName !== "Você")
      ? c.pushName
      : (c.lastMessage?.pushName && !c.lastMessage.pushName.match(/^\d+$/) && c.lastMessage.pushName !== "Você")
      ? c.lastMessage.pushName
      : null;

    const last10 = phone.slice(-10);
    const dbClient = clientByPhone.get(phone) || clientByPhone.get(last10);
    const dbLead = leadByPhone.get(phone) || leadByPhone.get(last10);

    let displayName = dbClient?.firstName
      ? `${dbClient.firstName} ${dbClient.lastName || ""}`.trim()
      : (dbLead?.name || contactBook.get(phone) || contactBook.get(last10) || pushName || null);

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
