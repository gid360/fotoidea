import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_QUICK_REPLIES = [
  {
    id: "1",
    title: "Приветствие и бронь",
    text: "Здравствуйте! Фотостудия FOTOIDEA рада вам помочь. На какую дату и время вы бы хотели забронировать съемку?",
  },
  {
    id: "2",
    title: "Адрес и локация",
    text: "Наш адрес: г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж (вход со двора). Ждем вас!",
  },
  {
    id: "3",
    title: "Оплата Kaspi",
    text: "Оплату брони вы можете произвести через Kaspi QR или наличными администратору перед началом съемки.",
  },
  {
    id: "4",
    title: "Подарочные сертификаты",
    text: "Подарочный сертификат можно приобрести как в электронном виде, так и в брендированном бумажном конверте.",
  },
];

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "quick_replies" },
    });

    if (!setting) {
      return NextResponse.json({ replies: DEFAULT_QUICK_REPLIES });
    }

    const replies = JSON.parse(setting.value);
    return NextResponse.json({ replies });
  } catch (error: any) {
    console.error("Error fetching quick replies:", error);
    return NextResponse.json({ replies: DEFAULT_QUICK_REPLIES });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { replies } = body;

    if (!Array.isArray(replies)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: "quick_replies" },
      update: { value: JSON.stringify(replies) },
      create: { key: "quick_replies", value: JSON.stringify(replies) },
    });

    return NextResponse.json({ success: true, replies });
  } catch (error: any) {
    console.error("Error saving quick replies:", error);
    return NextResponse.json({ error: error.message || "Error saving" }, { status: 500 });
  }
}
