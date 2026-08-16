import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle, Camera, Phone, MapPin, Instagram, Calendar, ShieldCheck, Gift } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Электронный сертификат — Fotoidea Studio",
  description: "Просмотр электронного подарочного сертификата фотостудии Fotoidea",
};

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const cert = await prisma.certificate.findFirst({
    where: {
      OR: [
        { code: code },
        { id: code },
      ],
    },
    include: {
      client: true,
    },
  });

  if (!cert) {
    notFound();
  }

  let planName = "";
  let planDescription = "";
  let planDurationMin: number | null = null;
  if (cert.planId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: cert.planId },
    });
    if (plan) {
      planName = plan.name;
      if (plan.description) planDescription = plan.description;
      if (plan.durationMin) planDurationMin = plan.durationMin;
    }
  }

  const isExpired = cert.expiresAt ? new Date() > cert.expiresAt : false;
  const isActivated = cert.status === "ACTIVATED";
  const isValid = cert.status === "SOLD" && !isExpired;

  const expiresStr = cert.expiresAt
    ? format(new Date(cert.expiresAt), "dd MMMM yyyy", { locale: ru })
    : "Бессрочно";

  let conditionLines: string[] = [];
  if (planDescription) {
    if (planDescription.includes("\n")) {
      conditionLines = planDescription.split("\n").map(l => l.trim()).filter(Boolean);
    } else {
      conditionLines = planDescription.split(/(?<=[.!?])\s+/).map(l => l.trim()).filter(Boolean);
    }
  } else {
    conditionLines = [
      planDurationMin ? `Продолжительность ${planDurationMin} минут` : "Продолжительность 1 час",
      "Готовые интерьерные фотозоны",
      `Количество участников до ${cert.peopleCount || 4} человек`,
      "Обработанные фотографии на облаке",
    ];
  }

  if (cert.peopleCount) {
    const pIdx = conditionLines.findIndex(l => l.toLowerCase().includes("участник") || l.toLowerCase().includes("человек"));
    if (pIdx !== -1) {
      conditionLines[pIdx] = `Количество участников до ${cert.peopleCount} человек`;
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#3D352E] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#D6C4A5]/40 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#3D352E] text-[#FAF8F5] p-6 text-center relative flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fotoidea-logo.png" alt="Fotoidea Logo" className="w-12 h-12 object-contain mb-[25px] brightness-200" />
          <div className="text-amber-300 font-serif italic text-2xl mb-1">Fotoidea.kz</div>
          <h1 className="text-xl font-bold tracking-widest uppercase">ПОДАРОЧНЫЙ СЕРТИФИКАТ</h1>
          <p className="text-xs text-amber-200/80 tracking-wider mt-0.5">НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ</p>

          {/* Status Badge */}
          <div className="mt-4 flex justify-center">
            {isValid && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs px-3.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Действителен
              </span>
            )}
            {isActivated && (
              <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/40 text-xs px-3.5 py-1 rounded-full font-medium">
                <Clock className="w-3.5 h-3.5" /> Активирован
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs px-3.5 py-1 rounded-full font-medium">
                <XCircle className="w-3.5 h-3.5" /> Срок действия истёк
              </span>
            )}
          </div>
        </div>

        {/* Certificate Card Content */}
        <div className="p-6 space-y-6">
          {/* Certificate Code Box */}
          <div className="bg-[#FAF8F5] border border-[#D6C4A5] rounded-xl p-4 text-center">
            <span className="text-xs text-[#7D7265] uppercase font-semibold tracking-wider block mb-1">
              Уникальный номер сертификата
            </span>
            <span className="font-mono text-2xl font-bold text-[#3D352E] tracking-wider">
              № {cert.code}
            </span>
          </div>

          {/* Details & Services */}
          <div className="space-y-3 border-b border-[#D6C4A5]/30 pb-5">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-[#3D352E]">Содержание сертификата:</h3>
                <p className="text-base font-bold text-amber-900 mt-0.5">
                  {cert.type === "NOMINAL"
                    ? `Номинал ${Number(cert.nominalAmount || 0).toLocaleString("ru-RU")} ₸ на любые услуги`
                    : (planName || "Индивидуальная фотосессия в студии FOTOIDEA")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#7D7265] pt-1">
              <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Действителен до: <strong className="text-[#3D352E] font-medium">{expiresStr}</strong></span>
            </div>

            {cert.buyerName && (
              <div className="flex items-center gap-3 text-xs text-[#7D7265]">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Покупатель: <span className="text-[#3D352E] font-medium">{cert.buyerName}</span></span>
              </div>
            )}
          </div>

          {/* Service Conditions */}
          <div className="bg-[#FAF8F5] rounded-xl p-4 text-xs space-y-2 border border-[#D6C4A5]/30">
            <h4 className="font-bold text-[#3D352E] mb-1.5 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-700" /> Что входит в фотосессию:
            </h4>
            <ul className="space-y-1 text-[#7D7265] italic list-disc list-inside">
              {conditionLines.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Contacts & Location */}
          <div className="space-y-2.5 text-xs text-[#7D7265] pt-1">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-amber-700 shrink-0" />
              <a href="https://wa.me/77777979888" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-[#3D352E]">
                +7 777 79 79 888 (WhatsApp)
              </a>
            </div>

            <div className="flex items-center gap-2.5">
              <Instagram className="w-4 h-4 text-amber-700 shrink-0" />
              <a href="https://instagram.com/fotoideakz" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-[#3D352E]">
                @fotoideakz
              </a>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <a
              href={`https://wa.me/77777979888?text=${encodeURIComponent(`Здравствуйте! Хочу забронировать фотосессию по сертификату № ${cert.code}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#3D352E] hover:bg-[#2A241F] text-[#FAF8F5] font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Phone className="w-4 h-4" /> Забронировать в WhatsApp
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F5] border-t border-[#D6C4A5]/30 p-4 text-center text-[11px] text-[#7D7265]">
          Фотостудия FOTOIDEA · www.fotoidea.kz
        </div>
      </div>
    </div>
  );
}
