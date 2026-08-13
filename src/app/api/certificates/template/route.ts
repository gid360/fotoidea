import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const DEFAULT_TEMPLATE = {
  bgType: "COLOR",
  bgColor: "#FAF8F5",
  bgGradientFrom: "#FAF8F5",
  bgGradientTo: "#FAF8F5",
  bgImageUrl: "",
  accentColor: "#3D352E",
  textColor: "#3D352E",
  subtextColor: "#7D7265",
  fontFamily: "Roboto",
  titleText: "С Е Р Т И Ф И К А Т",
  subtitleText: "НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ",
  rulesText: "Продолжительность 1 час\n100 обработанных фотографий\nКоличество участников до 6 человек\nПомощь в позировании",
  studioPhone: "+7 777 79 79 888",
  studioInstagram: "fotoideakz",
  studioAddress: "г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж",
  studioWebsite: "WWW.FOTOIDEA.KZ",
  showBorder: true,
  borderColor: "#D6C4A5",
  titlePosY: 20,
  codePosY: 40,
  detailsPosY: 60,
  rulesPosY: 80,
};

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "certificate_template" },
    });

    if (!setting) {
      return NextResponse.json(DEFAULT_TEMPLATE);
    }

    const template = JSON.parse(setting.value);
    return NextResponse.json({ ...DEFAULT_TEMPLATE, ...template });
  } catch (error: any) {
    return NextResponse.json(DEFAULT_TEMPLATE);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const valueStr = JSON.stringify(body);

    await prisma.setting.upsert({
      where: { key: "certificate_template" },
      update: { value: valueStr },
      create: { key: "certificate_template", value: valueStr },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Ошибка сохранения шаблона" },
      { status: 500 }
    );
  }
}
