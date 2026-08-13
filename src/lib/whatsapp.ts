import { prisma } from "@/lib/prisma";

export interface SendWhatsAppParams {
  phone: string;
  body: string;
  clientId?: string;
  templateId?: string;
  refId?: string;
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams) {
  let phone = params.phone.replace(/\D/g, "");
  if (phone.startsWith("8") && phone.length === 11) {
    phone = "7" + phone.slice(1);
  }

  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });

  let status: "QUEUED" | "SENT" | "ERROR" = "QUEUED";
  let errorText: string | null = null;
  let sentAt: Date | null = null;

  if (wa?.isOnline) {
    const provider = wa.provider || "EVOLUTION";

    if (provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
      try {
        const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
        const url = `${cleanServerUrl}/message/sendText/${wa.instanceName}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": wa.apiKey,
          },
          body: JSON.stringify({
            number: phone,
            text: params.body,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          status = "SENT";
          sentAt = new Date();
        } else {
          const err = await res.json().catch(() => ({}));
          status = "ERROR";
          errorText = err?.message || err?.response?.message || err?.error || `HTTP ${res.status}`;
        }
      } catch (e) {
        status = "ERROR";
        errorText = e instanceof Error ? e.message : "Ошибка подключения к Evolution API";
      }
    } else if (provider === "GREEN_API" && wa.gatewayId && wa.apiToken) {
      try {
        const url = `https://api.green-api.com/waInstance${wa.gatewayId}/sendMessage/${wa.apiToken}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: `${phone}@c.us`, message: params.body }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          status = "SENT";
          sentAt = new Date();
        } else {
          const err = await res.json().catch(() => ({}));
          status = "ERROR";
          errorText = err?.description ?? `HTTP ${res.status}`;
        }
      } catch (e) {
        status = "ERROR";
        errorText = e instanceof Error ? e.message : "Ошибка подключения к Green API";
      }
    }
  }

  const msg = await prisma.whatsAppMessage.create({
    data: {
      phone,
      body: params.body,
      status,
      errorText,
      sentAt,
      clientId: params.clientId ?? null,
      templateId: params.templateId ?? null,
      refId: params.refId ?? null,
    },
  });

  return msg;
}

export async function fetchEvolutionStatusAndQR() {
  const wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
  if (!wa || wa.provider !== "EVOLUTION" || !wa.serverUrl || !wa.instanceName || !wa.apiKey) {
    return { state: "DISCONNECTED", qrCode: null, isOnline: false };
  }

  const cleanServerUrl = wa.serverUrl.replace(/\/+$/, "");
  const headers = { "apikey": wa.apiKey };

  let isOnline = false;
  let state = "close";
  let qrCode: string | null = null;

  try {
    // 1. Check connection state
    const stateRes = await fetch(`${cleanServerUrl}/instance/connectionState/${wa.instanceName}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (stateRes.ok) {
      const data = await stateRes.json();
      state = data?.instance?.state || data?.state || "close";
      if (state === "open" || state === "CONNECTED" || state === "connected") {
        isOnline = true;
      }
    }
  } catch (e) {
    console.error("Evolution API status check error:", e);
  }

  // 2. If not online, get QR code
  if (!isOnline) {
    try {
      const connectRes = await fetch(`${cleanServerUrl}/instance/connect/${wa.instanceName}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (connectRes.ok) {
        const data = await connectRes.json();
        qrCode = data?.base64 || data?.qrcode?.base64 || data?.code || null;
      }
    } catch (e) {
      console.error("Evolution API QR fetch error:", e);
    }
  }

  // Update online status in DB if changed
  if (wa.isOnline !== isOnline) {
    await prisma.whatsAppSession.update({
      where: { id: "singleton" },
      data: { isOnline },
    });
  }

  return { state, qrCode, isOnline };
}
