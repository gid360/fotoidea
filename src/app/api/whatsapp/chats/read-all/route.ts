import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
    if (wa && wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
      const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
      const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

      try {
        const chatsRes = await fetch(`${cleanServerUrl}/chat/findChats/${wa.instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(5000),
        });

        if (chatsRes.ok) {
          const chats = await chatsRes.json();
          const unreadChats = Array.isArray(chats) ? chats.filter((c: any) => (c.unreadCount || 0) > 0) : [];

          for (const c of unreadChats.slice(0, 30)) {
            const jid = c.remoteJid || c.id;
            if (!jid) continue;

            const msgRes = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
              method: "POST",
              headers,
              body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 10 }),
              signal: AbortSignal.timeout(3000),
            });

            if (msgRes.ok) {
              const msgData = await msgRes.json();
              const rawMsgs = msgData?.messages?.records || msgData?.records || msgData?.messages || [];
              const readMessages = rawMsgs
                .filter((m: any) => !(m.key?.fromMe ?? m.fromMe) && (m.key?.id || m.id))
                .map((m: any) => ({
                  remoteJid: m.key?.remoteJid || jid,
                  fromMe: false,
                  id: m.key?.id || m.id,
                }));

              if (readMessages.length > 0) {
                await fetch(`${cleanServerUrl}/chat/markMessageAsRead/${wa.instanceName}`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ readMessages }),
                  signal: AbortSignal.timeout(3000),
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error reading all chats in evolution:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all read:", error);
    return NextResponse.json({ success: true });
  }
}
