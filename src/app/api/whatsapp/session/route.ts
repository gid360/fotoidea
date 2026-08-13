import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchEvolutionStatusAndQR } from "@/lib/whatsapp";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });

  if (wa && wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
    try {
      await fetchEvolutionStatusAndQR();
      wa = await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } });
    } catch (e) {
      console.error("Auto status check failed:", e);
    }
  }

  return NextResponse.json(
    wa ?? {
      id: "singleton",
      isOnline: false,
      provider: "EVOLUTION",
      serverUrl: null,
      instanceName: null,
      apiKey: null,
      gatewayId: null,
      apiToken: null,
    }
  );
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { isOnline, provider, serverUrl, instanceName, apiKey, gatewayId, apiToken } = body;

  let wa = await prisma.whatsAppSession.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      isOnline: isOnline ?? false,
      provider: provider ?? "EVOLUTION",
      serverUrl: serverUrl ?? null,
      instanceName: instanceName ?? null,
      apiKey: apiKey ?? null,
      gatewayId: gatewayId ?? null,
      apiToken: apiToken ?? null,
    },
    update: {
      ...(isOnline !== undefined && { isOnline }),
      ...(provider !== undefined && { provider }),
      ...(serverUrl !== undefined && { serverUrl }),
      ...(instanceName !== undefined && { instanceName }),
      ...(apiKey !== undefined && { apiKey }),
      ...(gatewayId !== undefined && { gatewayId }),
      ...(apiToken !== undefined && { apiToken }),
    },
  });

  if (wa.provider === "EVOLUTION" && wa.serverUrl && wa.instanceName && wa.apiKey) {
    try {
      await fetchEvolutionStatusAndQR();
      wa = (await prisma.whatsAppSession.findUnique({ where: { id: "singleton" } })) || wa;
    } catch (e) {
      console.error("Auto status check after PATCH failed:", e);
    }
  }

  return NextResponse.json(wa);
}
