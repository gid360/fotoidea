import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const decodedJid = decodeURIComponent(id);

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  let messages: any[] = [];
  let remoteJid = decodedJid;

  if (!remoteJid.includes("@")) {
    remoteJid = `${remoteJid}@s.whatsapp.net`;
  }

  let phone = remoteJid.split("@")[0].replace(/\D/g, "");

  let chatProfilePic: string | null = null;
  let pushName: string | null = null;

  if (wa && wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
    const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
    const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

    try {
      // 1. Try exact remoteJid for messages
      let res = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ where: { key: { remoteJid } }, limit: 50 }),
        signal: AbortSignal.timeout(8000),
      });

      let rawMsgs: any[] = [];
      if (res.ok) {
        const data = await res.json();
        rawMsgs = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
      }

      // 2. Fallback to phone@s.whatsapp.net if no messages found
      if ((!Array.isArray(rawMsgs) || rawMsgs.length === 0) && phone && phone.length <= 12) {
        const altJid = `${phone}@s.whatsapp.net`;
        if (altJid !== remoteJid) {
          res = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ where: { key: { remoteJid: altJid } }, limit: 50 }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const data = await res.json();
            rawMsgs = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
          }
        }
      }

      // Extract real phone number and pushName if found in message keys
      if (Array.isArray(rawMsgs) && rawMsgs.length > 0) {
        for (const m of rawMsgs) {
          if (!pushName && m.pushName && !m.pushName.match(/^\d+$/) && m.pushName !== "Você") {
            pushName = m.pushName;
          }
          if (m.key?.remoteJidAlt) {
            const altPhone = m.key.remoteJidAlt.split("@")[0].replace(/\D/g, "");
            if (altPhone && altPhone.length <= 12) {
              phone = altPhone;
            }
          }
        }

        // 1. Build reactions map from standalone reaction messages or attached reaction fields
        const reactionsMap = new Map<string, string[]>();
        const editedTargetIds = new Set<string>();

        for (const m of rawMsgs) {
          const msg = m.message || m;
          // 1. Reactions
          if (msg?.reactionMessage?.key?.id && msg?.reactionMessage?.text) {
            const targetId = msg.reactionMessage.key.id;
            const emoji = msg.reactionMessage.text;
            if (emoji) {
              const list = reactionsMap.get(targetId) || [];
              if (!list.includes(emoji)) list.push(emoji);
              reactionsMap.set(targetId, list);
            }
          } else if (Array.isArray(m.reactions)) {
            for (const r of m.reactions) {
              const targetId = m.id || m.key?.id;
              const emoji = typeof r === "string" ? r : (r.text || r.emoji);
              if (targetId && emoji) {
                const list = reactionsMap.get(targetId) || [];
                if (!list.includes(emoji)) list.push(emoji);
                reactionsMap.set(targetId, list);
              }
            }
          } else if (m.reactions && typeof m.reactions === "object" && m.reactions.text) {
            const targetId = m.reactions.key?.id || m.id || m.key?.id;
            const emoji = m.reactions.text;
            if (targetId && emoji) {
              const list = reactionsMap.get(targetId) || [];
              if (!list.includes(emoji)) list.push(emoji);
              reactionsMap.set(targetId, list);
            }
          }

          // 2. Edit targets from encrypted packets or protocol messages
          const editTargetId = msg?.secretEncryptedMessage?.targetMessageKey?.id
            || msg?.protocolMessage?.key?.id
            || msg?.editedMessage?.message?.protocolMessage?.key?.id
            || m?.protocolMessage?.key?.id;
          if (editTargetId) {
            editedTargetIds.add(editTargetId);
          }
        }

        // 2. Process messages
        const processedMsgs = await Promise.all(
          rawMsgs.map(async (m: any) => {
            const msg = m.message || m;
            const realMsg = msg?.ephemeralMessage?.message
              || msg?.viewOnceMessage?.message
              || msg?.viewOnceMessageV2?.message
              || msg?.documentWithCaptionMessage?.message
              || msg?.editedMessage?.message?.protocolMessage?.editedMessage
              || msg;

            // Ignore standalone reaction notifications and technical encrypted messages
            if (realMsg?.reactionMessage && !realMsg?.conversation && !realMsg?.extendedTextMessage) {
              return null;
            }
            if (realMsg?.secretEncryptedMessage && !realMsg?.conversation && !realMsg?.extendedTextMessage) {
              return null;
            }
            if (m.messageType === "secretEncryptedMessage" || m.messageType === "senderKeyDistributionMessage") {
              return null;
            }
            if (realMsg?.protocolMessage && !realMsg?.conversation && !realMsg?.extendedTextMessage && !realMsg?.protocolMessage?.editedMessage) {
              return null;
            }

            let mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | null = null;
            let fileName: string | null = null;
            let text = "";

            if (realMsg?.conversation) {
              text = realMsg.conversation;
            } else if (realMsg?.extendedTextMessage?.text) {
              text = realMsg.extendedTextMessage.text;
            } else if (realMsg?.protocolMessage?.editedMessage) {
              text = realMsg.protocolMessage.editedMessage.conversation
                || realMsg.protocolMessage.editedMessage.extendedTextMessage?.text
                || "";
            } else if (realMsg?.buttonsResponseMessage?.selectedDisplayText || realMsg?.buttonsResponseMessage?.selectedButtonId) {
              text = realMsg.buttonsResponseMessage.selectedDisplayText || realMsg.buttonsResponseMessage.selectedButtonId || "";
            } else if (realMsg?.buttonsMessage?.contentText || realMsg?.buttonsMessage?.headerText) {
              text = realMsg.buttonsMessage.contentText || realMsg.buttonsMessage.headerText || "";
            } else if (realMsg?.templateButtonReplyMessage?.selectedDisplayText) {
              text = realMsg.templateButtonReplyMessage.selectedDisplayText;
            } else if (realMsg?.listResponseMessage?.title || realMsg?.listResponseMessage?.singleSelectReply?.selectedRowId) {
              text = realMsg.listResponseMessage.title || realMsg.listResponseMessage.singleSelectReply?.selectedRowId || "";
            } else if (realMsg?.listMessage?.description || realMsg?.listMessage?.title) {
              text = (realMsg.listMessage.title ? realMsg.listMessage.title + "\n" : "") + (realMsg.listMessage.description || "");
            } else if (realMsg?.interactiveResponseMessage?.body?.text) {
              text = realMsg.interactiveResponseMessage.body.text;
            } else if (realMsg?.interactiveMessage?.body?.text) {
              text = realMsg.interactiveMessage.body.text;
            } else if (realMsg?.templateMessage?.hydratedTemplate?.hydratedContentText) {
              text = realMsg.templateMessage.hydratedTemplate.hydratedContentText;
            } else if (realMsg?.audioMessage) {
              mediaType = "AUDIO";
              text = "🎤 Голосовое сообщение";
            } else if (realMsg?.imageMessage) {
              mediaType = "IMAGE";
              text = realMsg.imageMessage.caption || "📷 Фотография";
            } else if (realMsg?.videoMessage) {
              mediaType = "VIDEO";
              text = realMsg.videoMessage.caption || "🎥 Видео";
            } else if (realMsg?.ptvMessage) {
              mediaType = "VIDEO";
              text = "📹 Видео-сообщение";
            } else if (realMsg?.documentMessage) {
              mediaType = "DOCUMENT";
              fileName = realMsg.documentMessage.fileName || realMsg.documentMessage.title || "файл";
              text = realMsg.documentMessage.caption || fileName || "📄 Документ";
            } else if (realMsg?.stickerMessage) {
              mediaType = "IMAGE";
              text = "Sticker";
            } else if (realMsg?.contactMessage) {
              text = `👤 Контакт: ${realMsg.contactMessage.displayName || ""}`.trim();
            } else if (realMsg?.contactsArrayMessage) {
              text = "👤 Карточка контакта";
            } else if (realMsg?.locationMessage || realMsg?.liveLocationMessage) {
              text = "📍 Геолокация";
            } else if (realMsg?.pollCreationMessage) {
              text = `📊 Опрос: ${realMsg.pollCreationMessage.name || ""}`;
            } else if (realMsg?.protocolMessage) {
              text = "🚫 Сообщение удалено";
            } else if (m.body) {
              text = m.body;
            } else if (m.caption) {
              text = m.caption;
            } else if (m.text) {
              text = m.text;
            } else if (m.content && typeof m.content === "string") {
              text = m.content;
            }

            let mediaUrl: string | null = null;

            // Use on-demand streaming media route to prevent slow blocking base64 downloads
            if (mediaType) {
              const msgId = m.key?.id || m.id;
              const msgJid = m.key?.remoteJid || remoteJid;
              if (msgId) {
                mediaUrl = `/api/whatsapp/media?id=${encodeURIComponent(msgId)}&jid=${encodeURIComponent(msgJid)}&filename=${encodeURIComponent(fileName || "attachment")}`;
              }
            }

            const ts = m.messageTimestamp
              ? new Date(m.messageTimestamp * 1000).toISOString()
              : (m.createdAt || new Date().toISOString());

            const msgId = m.key?.id || m.id || Math.random().toString();
            const isEdited = Boolean(
              editedTargetIds.has(msgId) ||
              (m.id && editedTargetIds.has(m.id)) ||
              m.isEdited ||
              m.edited ||
              msg?.editedMessage ||
              m?.editedMessage ||
              m?.message?.editedMessage ||
              msg?.protocolMessage?.type === "MESSAGE_EDIT" ||
              msg?.protocolMessage?.type === 14 ||
              m?.protocolMessage?.type === "MESSAGE_EDIT" ||
              m?.protocolMessage?.type === 14 ||
              (Array.isArray(m.MessageUpdate) && m.MessageUpdate.some((u: any) => u.status === "EDITED" || u.updateType === "EDIT"))
            );

            const msgReactions = reactionsMap.get(msgId) || (m.id ? reactionsMap.get(m.id) : null) || (m.reactions?.text ? [m.reactions.text] : []);

            return {
              id: msgId,
              conversationId: id,
              direction: m.key?.fromMe ? "OUTGOING" : "INCOMING",
              text: text || "",
              mediaUrl,
              mediaType,
              fileName,
              status: m.status || "SENT",
              createdAt: ts,
              isEdited,
              reactions: msgReactions.filter(Boolean),
              author: null,
            };
          })
        );

        messages = (processedMsgs.filter(Boolean) as any[]).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      // 3. Query phonebook contact if pushName is missing
      if (!pushName && phone && phone.length <= 12) {
        try {
          const ctRes = await fetch(`${cleanServerUrl}/chat/findContacts/${wa.instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(5000),
          });
          if (ctRes.ok) {
            const contacts = await ctRes.json();
            if (Array.isArray(contacts)) {
              const matched = contacts.find((c: any) => (c.remoteJid || c.id || "").includes(phone));
              if (matched) {
                pushName = matched.pushName || matched.name || matched.verifiedName || null;
              }
            }
          }
        } catch (e) {
          // ignore contact fetch error
        }
      }

      // 4. Fetch profile picture if available
      if (phone && phone.length <= 12) {
        try {
          const picRes = await fetch(`${cleanServerUrl}/chat/fetchProfilePictureUrl/${wa.instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ number: phone }),
            signal: AbortSignal.timeout(5000),
          });
          if (picRes.ok) {
            const picData = await picRes.json();
            if (picData?.profilePictureUrl) {
              chatProfilePic = picData.profilePictureUrl;
            }
          }
        } catch (e) {
          // ignore profile picture fetch error
        }
      }
    } catch (e) {
      console.error("Error fetching chat details in detail route:", e);
    }
  }

  const dbClient = await prisma.client.findFirst({
    where: { phone: { contains: phone.slice(-10) } },
    include: {
      bookings: {
        include: {
          classEvent: {
            include: {
              direction: true,
            }
          }
        }
      }
    }
  });

  const dbLead = await prisma.lead.findFirst({
    where: { phone: { contains: phone.slice(-10) } },
  });

  const now = new Date();
  const allBookings = dbClient?.bookings || [];
  const visitedCount = allBookings.filter(b => b.status !== "CANCELLED").length;
  const upcomingBookings = allBookings
    .filter(b => b.classEvent && new Date(b.classEvent.startAt) >= now && b.status !== "CANCELLED")
    .sort((a, b) => new Date(a.classEvent.startAt).getTime() - new Date(b.classEvent.startAt).getTime())
    .map(b => ({
      id: b.id,
      startAt: b.classEvent.startAt.toISOString(),
      directionName: b.classEvent.direction.name,
      status: b.status,
    }));

  let displayName = dbClient?.firstName
    ? `${dbClient.firstName} ${dbClient.lastName || ""}`.trim()
    : (dbLead?.name || pushName || null);
  if (displayName && (
    displayName.toLowerCase() === "fotoidea" ||
    displayName.includes("@c.us") ||
    displayName.includes("@g.us") ||
    /^[+\d\s().-]+$/.test(displayName)
  )) {
    displayName = null;
  }

  const avatarUrl = dbClient?.photoUrl || chatProfilePic || null;

  const detail = {
    id,
    clientId: dbClient?.id || id,
    remoteJid,
    funnelStageId: dbLead?.status || "NEW",
    assignedAdminId: null,
    status: "OPEN",
    lastMessageAt: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
    client: {
      id: dbClient?.id || id,
      phone,
      name: displayName,
      segment: dbClient?.loyaltyTag === "NEW" ? "NEW" : dbClient?.loyaltyTag === "LOST" ? "FORMER" : "ACTIVE",
      lastVisitAt: dbClient?.lastVisit ? dbClient.lastVisit.toISOString() : null,
      channel: "WHATSAPP",
      avatarUrl,
      source: dbLead?.source || "WHATSAPP",
      note: dbClient?.note || dbLead?.note || null,
      visitedCount,
      upcomingBookings,
    },
    funnelStage: dbClient ? {
      id: dbClient.loyaltyTag || "ACTIVE",
      name: dbClient.loyaltyTag === "NEW" ? "Новый" : dbClient.loyaltyTag === "LOST" ? "Потерянный" : "Действующий",
      order: 1,
      color: dbClient.loyaltyTag === "NEW" ? "#3b82f6" : dbClient.loyaltyTag === "LOST" ? "#ef4444" : "#144d37",
    } : {
      id: dbLead?.status || "NEW",
      name: dbLead?.status === "IN_PROGRESS" ? "В работе" : dbLead?.status === "SUCCESS" ? "Успешно" : dbLead?.status === "REJECTED" ? "Отказ" : "Новый лид",
      order: 1,
      color: dbLead?.status === "SUCCESS" ? "#144d37" : dbLead?.status === "REJECTED" ? "#ef4444" : "#3b82f6",
    },
    assignedAdmin: null,
    messages,
    notes: (() => {
      if (!dbClient?.note) return [];
      try {
        const parsed = JSON.parse(dbClient.note);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return dbClient.note.split("\n").filter(Boolean).map((line, idx) => ({
        id: `legacy-${idx}`,
        text: line.trim(),
        createdAt: dbClient.updatedAt.toISOString(),
        author: { name: "Менеджер" },
      }));
    })(),
  };

  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const rawPhone = body.phone || id;
  const phone = rawPhone.split("@")[0].replace(/\D/g, "");

  let client = null;
  if (phone && phone.length <= 12) {
    client = await prisma.client.findFirst({
      where: { phone: { contains: phone.slice(-10) } },
    });
  }

  if (!client && body.name) {
    client = await prisma.client.create({
      data: {
        firstName: body.name,
        lastName: "",
        phone: phone.length <= 12 ? (phone.startsWith("7") || phone.startsWith("8") ? `+7${phone.slice(-10)}` : `+${phone}`) : `+${phone}`,
      },
    });
  } else if (client && body.name) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { firstName: body.name },
    });
  }

  // Update funnel stage (both on Client if client exists, and Lead if lead exists)
  if (body.funnelStageId) {
    if (client) {
      const loyaltyTag = body.funnelStageId === "NEW" ? "NEW" : body.funnelStageId === "LOST" ? "LOST" : "REGULAR";
      await prisma.client.update({
        where: { id: client.id },
        data: { loyaltyTag },
      });
    }

    let lead = null;
    if (phone && phone.length <= 12) {
      lead = await prisma.lead.findFirst({
        where: { phone: { contains: phone.slice(-10) } },
      });
    }

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: body.funnelStageId },
      });
    } else {
      await prisma.lead.create({
        data: {
          name: client?.firstName || (phone.length <= 12 ? `+${phone}` : "Клиент"),
          phone: phone.length <= 12 ? `+${phone}` : "+" + phone,
          source: "WHATSAPP",
          status: body.funnelStageId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
