import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("id");
  const remoteJid = searchParams.get("jid");
  const isDownload = searchParams.get("download") === "1";
  const customFileName = searchParams.get("filename") || "attachment";

  if (!messageId) {
    return new NextResponse("Missing message ID", { status: 400 });
  }

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
    return new NextResponse("WhatsApp Evolution API is not configured", { status: 500 });
  }

  const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", "apikey": wa.apiKey };

  try {
    // 1. Find message by key.id
    const findWhere: any = { key: { id: messageId } };
    if (remoteJid) {
      findWhere.key.remoteJid = remoteJid;
    }

    const findRes = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ where: findWhere, limit: 1 }),
      signal: AbortSignal.timeout(8000),
    });

    let records: any[] = [];
    if (findRes.ok) {
      const data = await findRes.json();
      records = data?.messages?.records || data?.records || data?.messages || (Array.isArray(data) ? data : []);
    }

    // If not found with exact JID, try finding with only key.id
    if (records.length === 0 && remoteJid) {
      const retryRes = await fetch(`${cleanServerUrl}/chat/findMessages/${wa.instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ where: { key: { id: messageId } }, limit: 1 }),
        signal: AbortSignal.timeout(8000),
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        records = retryData?.messages?.records || retryData?.records || retryData?.messages || (Array.isArray(retryData) ? retryData : []);
      }
    }

    if (records.length === 0) {
      return new NextResponse("Message not found", { status: 404 });
    }

    const msg = records[0];

    // 2. Request decrypted media base64 from Evolution API
    const b64Res = await fetch(`${cleanServerUrl}/chat/getBase64FromMediaMessage/${wa.instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: msg,
        convertToMp4: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!b64Res.ok) {
      return new NextResponse("Failed to decrypt WhatsApp media", { status: 502 });
    }

    const b64Data = await b64Res.json();
    let rawBase64 = b64Data?.base64 || "";
    if (!rawBase64) {
      return new NextResponse("Empty media data from WhatsApp", { status: 404 });
    }

    // Strip data: prefix if present
    if (rawBase64.includes(";base64,")) {
      rawBase64 = rawBase64.split(";base64,")[1];
    }

    const buffer = Buffer.from(rawBase64, "base64");
    const mimeType = b64Data?.mimetype || "application/octet-stream";
    const fileName = b64Data?.fileName || customFileName;

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : `inline; filename="${encodeURIComponent(fileName)}"`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("Error retrieving WhatsApp media:", err);
    return new NextResponse("Error fetching media", { status: 500 });
  }
}
