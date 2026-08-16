"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ru, kk, enUS } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  ImageIcon,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { cn, formatMoney, formatDuration, calcExtraPeopleFee } from "@/lib/utils";
import { CategoryIconRenderer } from "@/app/settings/directions/DirectionsClient";

type Lang = "ru" | "kz" | "en";

const dateLocales: Record<Lang, any> = { ru, kz: kk, en: enUS };

const DICT = {
  ru: {
    subtitle: "Онлайн-запись в фотостудию",
    step1Nav: "1. Услуга",
    step2Nav: "2. Зал",
    step3Nav: "3. Время",
    step4Nav: "4. Детали",
    step1Title: "Шаг 1. Выберите услугу",
    step1Sub: "Выберите категорию и услугу для продолжения",
    standardPhoto: "Стандартная съёмка",
    step2Title: "Шаг 2. Выберите зал",
    serviceLabel: "Услуга",
    backToServices: "Назад к услугам",
    openHours: "Часы приема",
    selectHall: "Выбрать зал",
    step3Title: "Шаг 3. Выберите дату и время",
    hallLabel: "Зал",
    backToHalls: "Назад к выбору зала",
    freeDays: "Свободные дни",
    freeTime: "Свободное время",
    hallWorkHours: "Часы приема зала",
    noTimeSlots: "На эту дату свободного времени нет",
    tryAnotherDay: "Попробуйте выбрать другой день",
    today: "Сегодня",
    tomorrow: "Завтра",
    step4Title: "Шаг 4. Подтверждение бронирования",
    step4Sub: "Проверьте детали и введите данные для записи",
    backToTime: "Назад к выбору времени",
    summaryService: "Услуга:",
    summaryHall: "Зал:",
    summaryDateTime: "Дата и время:",
    summaryPeopleCount: "Количество человек:",
    summaryTotal: "Итого стоимость:",
    contactTitle: "Ваши контактные данные",
    nameLabel: "Ваше имя *",
    namePlaceholder: "Имя",
    phoneLabel: "Номер телефона *",
    phonePlaceholder: "+7 (7XX) XXX-XX-XX",
    noteLabel: "Примечание (необязательно)",
    notePlaceholder: "Пожелания к съёмке",
    confirmBooking: "Подтвердить запись",
    confirming: "Подтверждаем запись...",
    peopleSuffix: "чел.",
    successTitle: "Вы успешно записаны!",
    successSub: "Отправили на Whatsapp детали бронирования",
    backToMain: "Вернуться на главную",
    loadError: "Не удалось загрузить расписание фотостудии",
  },
  kz: {
    subtitle: "Фотостудияға онлайн-жазылу",
    step1Nav: "1. Қызмет",
    step2Nav: "2. Зал",
    step3Nav: "3. Уақыт",
    step4Nav: "4. Мәліметтер",
    step1Title: "1-қадам. Қызметті таңдаңыз",
    step1Sub: "Жалғастыру үшін санат пен қызметті таңдаңыз",
    standardPhoto: "Стандартты түсірілім",
    step2Title: "2-қадам. Залды таңдаңыз",
    serviceLabel: "Қызмет",
    backToServices: "Қызметтерге қайту",
    openHours: "Жұмыс уақыты",
    selectHall: "Залды таңдау",
    step3Title: "3-қадам. Күн мен уақытты таңдаңыз",
    hallLabel: "Зал",
    backToHalls: "Зал таңдауға қайту",
    freeDays: "Бос күндер",
    freeTime: "Бос уақыт",
    hallWorkHours: "Залдың жұмыс уақыты",
    noTimeSlots: "Бұл күнге бос уақыт жоқ",
    tryAnotherDay: "Басқа күнді таңдап көріңіз",
    today: "Бүгін",
    tomorrow: "Ертең",
    step4Title: "4-қадам. Брондауды растау",
    step4Sub: "Мәліметтерді тексеріп, жазылу деректерін енгізіңіз",
    backToTime: "Уақыт таңдауға қайту",
    summaryService: "Қызмет:",
    summaryHall: "Зал:",
    summaryDateTime: "Күн мен уақыт:",
    summaryPeopleCount: "Адамдар саны:",
    summaryTotal: "Жиынтық құны:",
    contactTitle: "Сіздің байланыс деректеріңіз",
    nameLabel: "Сіздің атыңыз *",
    namePlaceholder: "Атыңыз",
    phoneLabel: "Телефон нөмірі *",
    phonePlaceholder: "+7 (7XX) XXX-XX-XX",
    noteLabel: "Ескертпе (міндетті емес)",
    notePlaceholder: "Түсірілімге тілектер",
    confirmBooking: "Жазылуды растау",
    confirming: "Жазылу расталуда...",
    peopleSuffix: "адам",
    successTitle: "Сіз сәтті жазылдыңыз!",
    successSub: "Брондау мәліметтерін Whatsapp-қа жібердік",
    backToMain: "Басты бетке қайту",
    loadError: "Фотостудия кестесін жүктеу мүмкін болмады",
  },
  en: {
    subtitle: "Online Studio Booking",
    step1Nav: "1. Service",
    step2Nav: "2. Hall",
    step3Nav: "3. Time",
    step4Nav: "4. Details",
    step1Title: "Step 1. Select a service",
    step1Sub: "Select a category and service to proceed",
    standardPhoto: "Standard Photoshoot",
    step2Title: "Step 2. Select a hall",
    serviceLabel: "Service",
    backToServices: "Back to services",
    openHours: "Working hours",
    selectHall: "Select hall",
    step3Title: "Step 3. Select date & time",
    hallLabel: "Hall",
    backToHalls: "Back to hall selection",
    freeDays: "Available days",
    freeTime: "Available time",
    hallWorkHours: "Hall operating hours",
    noTimeSlots: "No available time slots on this date",
    tryAnotherDay: "Try choosing another date",
    today: "Today",
    tomorrow: "Tomorrow",
    step4Title: "Step 4. Booking Confirmation",
    step4Sub: "Review details and enter your contact info",
    backToTime: "Back to time selection",
    summaryService: "Service:",
    summaryHall: "Hall:",
    summaryDateTime: "Date & Time:",
    summaryPeopleCount: "Number of people:",
    summaryTotal: "Total price:",
    contactTitle: "Your contact information",
    nameLabel: "Your name *",
    namePlaceholder: "Name",
    phoneLabel: "Phone number *",
    phonePlaceholder: "+7 (7XX) XXX-XX-XX",
    noteLabel: "Note (optional)",
    notePlaceholder: "Special requests",
    confirmBooking: "Confirm booking",
    confirming: "Confirming booking...",
    peopleSuffix: "ppl",
    successTitle: "Booking successful!",
    successSub: "Booking details sent to WhatsApp",
    backToMain: "Return to home",
    loadError: "Failed to load studio schedule",
  },
};

interface Hall {
  id: string;
  name: string;
  description?: string | null;
  colorHex: string;
  openTime: string;
  closeTime: string;
}

function renderTextWithLinks(text: string | null | undefined) {
  if (!text) return null;
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.toLowerCase().startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-600 hover:text-white hover:border-violet-600 font-semibold text-[11px] transition-all shadow-2xs my-0.5 break-all group/linkbtn"
        >
          <span>{part}</span>
          <span className="text-[10px] group-hover/linkbtn:translate-x-0.5 transition-transform">↗</span>
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

import { PriceTier } from "@/lib/utils";

interface ServicePlan {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  price: string | number;
  isPriceRange?: boolean;
  priceTo?: string | number | null;
  priceTiers?: PriceTier[] | null;
  durationMin: number;
  peopleCount?: number;
  isPerPerson?: boolean;
  halls?: Hall[];
}

interface AvailableSlot {
  id: string;
  hallId: string;
  hallName: string;
  colorHex: string;
  date: string;
  time: string;
  startAt: string;
  durationMin: number;
}

interface Settings {
  studioName?: string;
  studioPhone?: string;
  studioAddress?: string;
  logoUrl?: string;
}

interface Direction {
  id: string;
  name: string;
  colorHex: string;
  icon?: string | null;
}

interface WidgetData {
  settings: Settings;
  halls: Hall[];
  services: ServicePlan[];
  directions?: Direction[];
  availableSlots: AvailableSlot[];
}

function formatKZPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "+7 ";
  let rest = digits;
  if (rest.startsWith("7") || rest.startsWith("8")) {
    rest = rest.slice(1);
  }
  rest = rest.slice(0, 10);

  if (rest.length === 0) return "+7 ";
  if (rest.length <= 3) return `+7 (${rest}`;
  if (rest.length <= 6) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
  if (rest.length <= 8) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
}

export function WidgetClient({ initialSettings }: { initialSettings?: Settings }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Multi-language state
  const [lang, setLang] = useState<Lang>("ru");
  const dict = DICT[lang];

  // Detect OS / Browser language automatically on mount
  useEffect(() => {
    // 1. Check if user previously manually selected a language
    const savedLang = typeof window !== "undefined" ? localStorage.getItem("fotoidea_widget_lang") : null;
    if (savedLang && (savedLang === "ru" || savedLang === "kz" || savedLang === "en")) {
      setLang(savedLang as Lang);
      return;
    }

    // 2. Otherwise auto-detect OS / Browser language
    if (typeof navigator !== "undefined") {
      const userLangs = (navigator.languages || [navigator.language || ""]).map(l => l.toLowerCase());
      const sysLang = userLangs[0] || "";

      if (sysLang.startsWith("kk") || sysLang.startsWith("kz")) {
        setLang("kz");
      } else if (sysLang.startsWith("en")) {
        setLang("en");
      } else {
        setLang("ru");
      }
    }
  }, []);

  function handleSelectLang(newLang: Lang) {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("fotoidea_widget_lang", newLang);
    }
  }

  // Wizard Step (1: Услуга, 2: Зал, 3: Время, 4: Детали)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<ServicePlan | null>(null);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Booking Form State (Step 4)
  const [peopleCount, setPeopleCount] = useState<number | string>("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  useEffect(() => {
    fetch("/api/widget?days=14")
      .then(r => r.json())
      .then((d: WidgetData) => {
        setData(d);
        setLoading(false);

        // Pre-select first category according to directions order
        const catsInServices = Array.from(
          new Set(d.services?.map(s => s.category).filter(Boolean) as string[])
        );
        const dirNames = (d.directions ?? []).map(dir => dir.name);
        const sortedCats = [
          ...dirNames.filter(name => catsInServices.includes(name)),
          ...catsInServices.filter(name => !dirNames.includes(name)),
        ];

        if (sortedCats.length > 0) {
          setSelectedCategory(sortedCats[0]);
        }

        const todayStr = format(new Date(), "yyyy-MM-dd");
        const firstSlotDate = d.availableSlots?.[0]?.date || todayStr;
        setSelectedDate(firstSlotDate);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const studioName = data?.settings?.studioName ?? initialSettings?.studioName ?? "Fotoidea";
  const logoUrl = data?.settings?.logoUrl ?? initialSettings?.logoUrl;
  const halls = data?.halls ?? [];
  const services = data?.services ?? [];
  const allSlots = data?.availableSlots ?? [];

  // Extract unique categories preserving directions drag & drop order
  const categoriesInServices = Array.from(
    new Set(services.map(s => s.category).filter(Boolean) as string[])
  );
  const dirNames = (data?.directions ?? []).map(d => d.name);
  const categoriesList = [
    ...dirNames.filter(name => categoriesInServices.includes(name)),
    ...categoriesInServices.filter(name => !dirNames.includes(name)),
  ];

  const isSingleHallService = Boolean(
    selectedService && (
      (selectedService.halls && selectedService.halls.length === 1) ||
      halls.some(h => selectedService.name.toLowerCase().includes(h.name.toLowerCase()))
    )
  );

  // Step 1: Select Service
  function handleSelectService(s: ServicePlan) {
    setSelectedService(s);
    setPeopleCount("");

    let singleHall: Hall | null = null;
    if (s.halls && s.halls.length === 1) {
      singleHall = halls.find(h => h.id === s.halls![0].id) || s.halls[0];
    } else {
      const sNameLower = s.name.toLowerCase();
      const matchByName = halls.find(h => sNameLower.includes(h.name.toLowerCase()));
      if (matchByName) {
        singleHall = matchByName;
      }
    }

    if (singleHall) {
      setSelectedHall(singleHall);
      setStep(3);
    } else {
      setSelectedHall(null);
      setStep(2);
    }
  }

  // Step 2: Select Hall
  function handleSelectHall(h: Hall) {
    setSelectedHall(h);
    setStep(3);
  }

  // Step 3: Select Date & Slot
  function handleSelectSlot(slot: AvailableSlot) {
    setSelectedSlot(slot);

    if (!selectedHall) {
      const h = halls.find(x => x.id === slot.hallId);
      if (h) setSelectedHall(h);
    }
    setStep(4);
  }

  // Filtered services in selected category
  const servicesInSelectedCategory = services.filter(s => s.category === selectedCategory);

  // Slots filtered by hall and selected date
  const filteredSlots = allSlots.filter(s => {
    if (selectedHall && s.hallId !== selectedHall.id) return false;
    if (selectedDate && s.date !== selectedDate) return false;
    return true;
  });

  // Group slots by date for date picker tabs
  const slotsByDateMap = new Map<string, AvailableSlot[]>();
  allSlots.forEach(s => {
    if (selectedHall && s.hallId !== selectedHall.id) return;
    const arr = slotsByDateMap.get(s.date) || [];
    arr.push(s);
    slotsByDateMap.set(s.date, arr);
  });

  // Generate 14 days list starting from today
  const daysList = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = format(d, "yyyy-MM-dd");
    const count = (slotsByDateMap.get(dateStr) || []).length;
    const isToday = i === 0;
    const isTomorrow = i === 1;
    const label = isToday ? dict.today : isTomorrow ? dict.tomorrow : format(d, "EEE", { locale: dateLocales[lang] });
    const subLabel = format(d, "d MMM", { locale: dateLocales[lang] });
    return { date: dateStr, label, subLabel, count };
  });

  // Calculate prices for Step 4
  const basePrice = selectedService ? Number(selectedService.price) : 15000;
  const serviceName = selectedService?.name ?? "Аренда зала / Фотосессия";
  const isRent = selectedService ? serviceName.toLowerCase().includes("аренда") : false;

  const parsedPeopleCount = typeof peopleCount === "number" ? peopleCount : (parseInt(peopleCount) || 1);

  const { fee: extraPeopleFee, ruleText } = calcExtraPeopleFee(
    serviceName,
    parsedPeopleCount,
    isRent,
    selectedSlot?.hallName || selectedHall?.name,
    selectedService?.peopleCount,
    selectedService?.isPerPerson,
    basePrice,
    selectedService?.priceTiers
  );
  const totalPrice = basePrice + extraPeopleFee;

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/widget/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hallId: selectedSlot.hallId,
          serviceId: selectedService?.id,
          date: selectedSlot.date,
          time: selectedSlot.time,
          peopleCount: parsedPeopleCount,
          firstName: firstName.trim(),
          phone: phone.trim(),
          note: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setSubmitError(json.error ?? "Ошибка при бронировании");
        return;
      }

      setBookingSuccess({
        slot: selectedSlot,
        serviceName,
        hallName: selectedSlot.hallName,
        totalPrice,
        peopleCount: parsedPeopleCount,
        customerName: firstName.trim(),
      });
    } catch {
      setSubmitting(false);
      setSubmitError("Не удалось связаться с сервером");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 py-3.5 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-lg shrink-0" />
            ) : loading ? (
              <div className="h-9 w-9 rounded-xl bg-slate-200 animate-pulse shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Camera className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-snug">{studioName}</h1>
              <p className="text-slate-500 text-xs">{dict.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-language Switcher (RU / KZ / EN) */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              {(["ru", "kz", "en"] as Lang[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleSelectLang(l)}
                  className={cn(
                    "px-2 py-1 rounded-lg transition-all uppercase text-[10px] font-bold",
                    lang === l
                      ? "bg-violet-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {data?.settings?.studioPhone && (
              <a
                href={`tel:${data.settings.studioPhone}`}
                className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
              >
                {data.settings.studioPhone}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Progress Steps Header */}
      {!loading && !error && !bookingSuccess && (
        <div className="bg-white/80 border-b border-slate-200/60 px-4 py-3 sticky top-[61px] z-10 backdrop-blur">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-1 text-xs font-semibold overflow-x-auto scrollbar-none py-0.5">
            {[
              { id: 1, name: dict.step1Nav },
              { id: 2, name: dict.step2Nav },
              { id: 3, name: dict.step3Nav },
              { id: 4, name: dict.step4Nav },
            ].map(s => {
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  disabled={s.id > step}
                  onClick={() => setStep(s.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 border",
                    isActive
                      ? "bg-violet-600 text-white font-bold border-violet-600 shadow-xs shadow-violet-200"
                      : isDone
                        ? "text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100 font-semibold"
                        : "text-slate-400 bg-transparent border-transparent cursor-not-allowed opacity-60"
                  )}
                >
                  {isDone && <Check className="h-3.5 w-3.5 text-violet-600" />}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4 pt-4">
            <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <Clock className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-slate-800 font-medium">{dict.loadError}</p>
          </div>
        ) : (
          <>
            {/* ─── ШАГ 1: ВЫБОР УСЛУГИ ─────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{dict.step1Title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{dict.step1Sub}</p>
                </div>

                {/* Горизонтальные мелкие кнопки категорий */}
                {categoriesList.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {categoriesList.map(cat => {
                      const isSel = selectedCategory === cat;
                      const dirMatch = (data?.directions ?? []).find(d => d.name === cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs",
                            isSel
                              ? "bg-violet-600 text-white border-violet-600 font-bold shadow-md shadow-violet-200"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          )}
                        >
                          <CategoryIconRenderer
                            iconName={dirMatch?.icon}
                            className={cn("h-3.5 w-3.5", isSel ? "text-white" : "text-violet-600")}
                          />
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Список услуг выбранной категории */}
                <div className="grid grid-cols-1 gap-3 pt-1">
                  {servicesInSelectedCategory.length > 0 ? (
                    servicesInSelectedCategory.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectService(s)}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-violet-500 hover:shadow-md transition-all text-left flex items-center gap-4 group"
                      >
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="" className="h-16 w-16 object-cover rounded-xl shrink-0 border border-slate-200" />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-violet-50 shrink-0 flex items-center justify-center text-violet-400 border border-violet-100">
                            <ImageIcon className="h-7 w-7 opacity-60 text-violet-500" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-violet-600 transition-colors">
                              {s.name}
                            </h3>
                            {s.category && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                                {s.category}
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs mt-2 text-slate-600 font-medium">
                            {s.durationMin > 0 && (
                              <>
                                <span>⏱ {formatDuration(s.durationMin)}</span>
                                <span>•</span>
                              </>
                            )}
                            <span className="text-violet-600 font-bold text-sm">
                              {s.isPriceRange && s.priceTo ? (
                                <span>{formatMoney(s.price)} – {formatMoney(s.priceTo)} ₸</span>
                              ) : (
                                <span>{formatMoney(s.price)} ₸</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all shrink-0" />
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => handleSelectService({ id: "default", name: dict.standardPhoto, price: 15000, durationMin: 60 })}
                      className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-violet-500 text-left flex justify-between items-center shadow-xs"
                    >
                      <div>
                        <h3 className="font-bold text-slate-900">{dict.standardPhoto}</h3>
                        <p className="text-xs text-slate-500 mt-1">15 000 ₸ · 1 час</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-violet-600" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── ШАГ 2: ВЫБОР ЗАЛА ────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{dict.step2Title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dict.serviceLabel}: <strong className="text-violet-600">{selectedService?.name ?? "Аренда"}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> {dict.backToServices}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {((selectedService?.halls && selectedService.halls.length > 0)
                    ? halls.filter(h => selectedService.halls?.some((sh: Hall) => sh.id === h.id))
                    : halls
                  ).map(h => {
                    const isSel = selectedHall?.id === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => handleSelectHall(h)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all group flex flex-col justify-between relative overflow-hidden shadow-xs",
                          isSel
                            ? "bg-violet-50/40 border-violet-600 ring-2 ring-violet-500/20 shadow-md"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: h.colorHex }} />
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-violet-600 transition-colors truncate">
                              {h.name}
                            </h3>
                          </div>
                          {h.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                              {renderTextWithLinks(h.description)}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-violet-600" />
                            <span>{dict.openHours}: <strong>{h.openTime || "09:00"} – {h.closeTime || "21:00"}</strong></span>
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-end text-xs font-semibold text-violet-600">
                          <span>{dict.selectHall}</span>
                          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── ШАГ 3: ВЫБОР ДАТЫ И СВОБОДНОГО ВРЕМЕНИ ────────────── */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{dict.step3Title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dict.serviceLabel}: <strong className="text-violet-600">{selectedService?.name}</strong>
                      {selectedHall && <span> · {dict.hallLabel}: <strong className="text-slate-800">{selectedHall.name}</strong></span>}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(isSingleHallService ? 1 : 2)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> {isSingleHallService ? dict.backToServices : dict.backToHalls}
                  </button>
                </div>

                {/* Выбор дня */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    {dict.freeDays}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {daysList.map(d => {
                      const isSel = selectedDate === d.date;
                      const hasSlots = d.count > 0;
                      return (
                        <button
                          key={d.date}
                          disabled={!hasSlots}
                          onClick={() => setSelectedDate(d.date)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all min-w-[72px] shrink-0 shadow-2xs",
                            !hasSlots
                              ? "opacity-40 border-slate-200 bg-slate-100/50 cursor-not-allowed text-slate-400"
                              : isSel
                                ? "bg-violet-600 border-violet-600 text-white font-bold shadow-md shadow-violet-200"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          <span className="text-xs font-semibold leading-none">{d.label}</span>
                          <span className="text-[11px] opacity-80 mt-1">{d.subLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Слоты времени */}
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block flex items-center justify-between">
                    <span>{dict.freeTime}</span>
                    <span className="text-[11px] text-slate-400 font-normal">{dict.hallWorkHours}</span>
                  </label>

                  {filteredSlots.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                      <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700">{dict.noTimeSlots}</p>
                      <p className="text-xs text-slate-400 mt-1">{dict.tryAnotherDay}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {filteredSlots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => handleSelectSlot(slot)}
                          className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-violet-600 hover:bg-violet-50/60 shadow-2xs transition-all text-center group active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: slot.colorHex }} />
                          <span className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                            {slot.time}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── ШАГ 4: ПОДТВЕРЖДЕНИЕ И ДАННЫЕ КЛИЕНТА ───────────── */}
            {step === 4 && selectedSlot && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{dict.step4Title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{dict.step4Sub}</p>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> {dict.backToTime}
                  </button>
                </div>

                {/* Сводка выбора */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                    <span className="text-slate-500">{dict.summaryService}</span>
                    <span className="font-bold text-slate-900 text-sm">{serviceName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                    <span className="text-slate-500">{dict.summaryHall}</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedSlot.colorHex }} />
                      {selectedSlot.hallName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                    <span className="text-slate-500">{dict.summaryDateTime}</span>
                    <span className="font-semibold text-slate-900">
                      {format(parseISO(selectedSlot.startAt), "d MMMM yyyy", { locale: dateLocales[lang] })} в <strong className="text-violet-600 font-bold">{selectedSlot.time}</strong>
                    </span>
                  </div>

                  {/* Переключатель количество человек */}
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">{dict.summaryPeopleCount}</span>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg h-7">
                        <button
                          type="button"
                          className="w-7 h-full flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200/80 transition-colors"
                          onClick={() => {
                            const cur = typeof peopleCount === "number" ? peopleCount : (parseInt(peopleCount) || 1);
                            setPeopleCount(Math.max(1, cur - 1));
                          }}
                          disabled={parsedPeopleCount <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={peopleCount}
                          onChange={e => setPeopleCount(e.target.value)}
                          className="w-12 text-center text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          className="w-7 h-full flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200/80 transition-colors"
                          onClick={() => {
                            const cur = typeof peopleCount === "number" ? peopleCount : (parseInt(peopleCount) || 1);
                            setPeopleCount(cur + 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">{ruleText}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-base font-bold">
                    <span className="text-slate-800">{dict.summaryTotal}</span>
                    <span className="text-violet-600 text-lg font-bold">{formatMoney(totalPrice)} ₸</span>
                  </div>
                </div>

                {/* Форма ввода контактов */}
                <form onSubmit={handleBookSubmit} className="space-y-3.5 bg-white p-5 border border-slate-200/90 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{dict.contactTitle}</h3>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{dict.nameLabel}</label>
                    <input
                      required
                      placeholder={dict.namePlaceholder}
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-1 focus:ring-violet-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{dict.phoneLabel}</label>
                    <input
                      required
                      type="tel"
                      placeholder="+7 (7XX) XXX-XX-XX"
                      value={phone}
                      onFocus={() => {
                        if (!phone || phone.trim() === "") {
                          setPhone("+7 ");
                        }
                      }}
                      onChange={e => setPhone(formatKZPhone(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{dict.noteLabel}</label>
                    <input
                      placeholder={dict.notePlaceholder}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-violet-600 focus:bg-white focus:ring-1 focus:ring-violet-500 transition-all"
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-600 text-center font-medium bg-red-50 border border-red-200 p-2.5 rounded-xl">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !firstName.trim() || phone.replace(/\D/g, "").length < 11}
                    className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-md shadow-violet-200 active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {submitting ? dict.confirming : `${dict.confirmBooking} (${formatMoney(totalPrice)} ₸)`}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* Success Modal */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl space-y-4">
            <div className="h-16 w-16 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto border border-violet-200">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{dict.successTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{dict.successSub}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
              <div className="text-slate-500">{dict.summaryService} <strong className="text-slate-900">{bookingSuccess.serviceName}</strong></div>
              <div className="text-slate-500">{dict.summaryHall} <strong className="text-slate-900">{bookingSuccess.hallName}</strong></div>
              <div className="text-slate-500">{dict.summaryDateTime} <strong className="text-slate-900">{format(parseISO(bookingSuccess.slot.startAt), "d MMMM yyyy в HH:mm", { locale: dateLocales[lang] })}</strong></div>
              <div className="text-slate-500">{dict.summaryPeopleCount} <strong className="text-slate-900">{bookingSuccess.peopleCount} {dict.peopleSuffix}</strong></div>
              <div className="text-slate-500">{dict.nameLabel.replace("*", "").trim()} <strong className="text-slate-900">{bookingSuccess.customerName}</strong></div>
              <div className="text-slate-500 pt-1.5 border-t border-slate-200">{dict.summaryTotal} <strong className="text-violet-600 text-sm font-bold">{formatMoney(bookingSuccess.totalPrice)} ₸</strong></div>
            </div>

            <button
              onClick={() => { setBookingSuccess(null); window.location.reload(); }}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              {dict.backToMain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
