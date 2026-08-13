import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CrmStage {
  status: string;
  label:  string;
  color:  string; // hex
  order:  number;
}

const DEFAULTS: CrmStage[] = [
  { status: "NEW",          label: "Новые",           color: "#6b7280", order: 0 },
  { status: "QUALIFYING",   label: "Переписка",        color: "#3b82f6", order: 1 },
  { status: "TRIAL_BOOKED", label: "Записан на проб.", color: "#f97316", order: 2 },
  { status: "TRIAL_DONE",   label: "Был на пробном",   color: "#0d9488", order: 3 },
  { status: "WON",          label: "Купил",            color: "#22c55e", order: 4 },
  { status: "LOST",         label: "Отказ",            color: "#ef4444", order: 5 },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: "crm_stages" } });
  if (!setting) return NextResponse.json(DEFAULTS);

  try {
    const stages = JSON.parse(setting.value) as CrmStage[];
    return NextResponse.json(stages.length ? stages : DEFAULTS);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = await req.json() as CrmStage[];

  await prisma.setting.upsert({
    where:  { key: "crm_stages" },
    create: { key: "crm_stages", value: JSON.stringify(stages) },
    update: { value: JSON.stringify(stages) },
  });

  return NextResponse.json(stages);
}
