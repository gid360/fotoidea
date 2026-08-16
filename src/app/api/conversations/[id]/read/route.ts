import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const decodedJid = decodeURIComponent(id);

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
    return NextResponse.json({ success: true });
  }

  const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

  let remoteJid = decodedJid;
  if (!remoteJid.includes("@")) {
    remoteJid = `${remoteJid}@s.whatsapp.net`;
  }

  try {
    // 1. Fetch recent messages for this JID to find incoming unread messages
    const res = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ where: { key: { remoteJid } }, limit: 20 }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const rawMsgs = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);

      const readMessages: any[] = [];
      for (const m of rawMsgs) {
        const isFromMe = m.key?.fromMe ?? m.fromMe ?? false;
        const msgId = m.key?.id || m.id;
        const msgJid = m.key?.remoteJid || remoteJid;
        if (!isFromMe && msgId) {
          readMessages.push({
            remoteJid: msgJid,
            fromMe: false,
            id: msgId,
          });
        }
      }

      if (readMessages.length > 0) {
        await fetch(`${cleanServerUrl}/chat/markMessageAsRead/${wa.instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ readMessages }),
          signal: AbortSignal.timeout(5000),
        });
      }
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }

  return NextResponse.json({ success: true });
}
