"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { format } from "date-fns";
import { cn, formatMoney, formatDuration, calcExtraPeopleFee } from "@/lib/utils";
import { Search, User, Plus, X } from "lucide-react";

const schema = z.object({
  clientId: z.string().min(1, "Пожалуйста, выберите клиента для записи"),
  directionId: z.string().min(1, "Выберите услугу"),
  trainerId: z.string().optional(),
  hallId: z.string().min(1, "Выберите зал"),
  date: z.string().min(1, "Укажите дату"),
  time: z.string().min(1, "Укажите время"),
  durationMin: z.coerce.number(),
  servicePrice: z.coerce.number().min(0),
  extraPeopleFee: z.coerce.number().min(0),
  wardrobeFee: z.coerce.number().min(0),
  prepayment: z.union([z.coerce.number(), z.string()]).optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Hall { id: string; name: string; colorHex?: string }
interface ServicePlan {
  id: string;
  name: string;
  price: string | number;
  durationMin?: number;
  category?: string;
  hallId?: string | null;
  peopleCount?: number;
  isPerPerson?: boolean;
  priceTiers?: any;
}
interface Direction { id: string; name: string; colorHex: string }
interface Trainer { id: string; percentRate: number; user: { firstName: string; lastName: string } }
interface Client { id: string; firstName: string; lastName: string; phone: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  selectedDate: Date;
  selectedTime?: string;
  selectedHallId?: string;
}

const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function CreateClassDialog({ open, onClose, onCreated, selectedDate, selectedTime, selectedHallId }: Props) {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [services, setServices] = useState<ServicePlan[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [peopleCount, setPeopleCount] = useState(1);
  const [serviceSearch, setServiceSearch] = useState("");

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
  const filteredDirections = directions.filter(d => d.name.toLowerCase().includes(serviceSearch.toLowerCase()));

  // Состояния для поиска и выбора клиента
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: "",
      durationMin: 60,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime || "09:00",
      trainerId: "none",
      servicePrice: 15000,
      extraPeopleFee: 0,
      wardrobeFee: 0,
      prepayment: "",
    },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/halls").then(r => r.json()),
      fetch("/api/subscriptions/plans").then(r => r.json()),
      fetch("/api/directions").then(r => r.json()),
      fetch("/api/trainers").then(r => r.json()),
    ]).then(([h, s, d, t]) => {
      setHalls(h);
      setServices(s);
      setDirections(d);
      const sortedTrainers = Array.isArray(t)
        ? [...t].sort((a, b) => {
            const nameA = `${a.user.firstName || ""} ${a.user.lastName || ""}`.trim();
            const nameB = `${b.user.firstName || ""} ${b.user.lastName || ""}`.trim();
            return nameA.localeCompare(nameB, "ru", { sensitivity: "base" });
          })
        : [];
      setTrainers(sortedTrainers);
    });
  }, []);

  // Живой поиск клиентов по имени или номеру телефона
  useEffect(() => {
    if (!clientSearch.trim()) {
      setClientResults([]);
      setIsSearchingClient(false);
      return;
    }

    setIsSearchingClient(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setClientResults(Array.isArray(data) ? data : (data.clients || []));
        }
      } catch {
        setClientResults([]);
      } finally {
        setIsSearchingClient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    if (open) {
      const defaultHall = selectedHallId || (halls[0]?.id ?? "");
      const defaultService = services[0];
      const defaultDir = directions[0]?.id || "";

      const initPrice = defaultService ? Number(defaultService.price) : 15000;
      const initDuration = defaultService?.durationMin ? Number(defaultService.durationMin) : 60;

      setPeopleCount(1);
      setServiceSearch("");
      setSelectedClient(null);
      setClientSearch("");
      setClientResults([]);
      setShowQuickCreate(false);
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");

      reset({
        clientId: "",
        durationMin: initDuration,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime || "09:00",
        hallId: defaultHall,
        directionId: defaultDir,
        trainerId: "none",
        servicePrice: initPrice,
        extraPeopleFee: 0,
        wardrobeFee: 0,
        prepayment: "",
      });
    }
  }, [open, selectedDate, selectedTime, selectedHallId, reset, halls, services, directions]);

  const currentServiceId = watch("directionId");
  const currentTrainerId = watch("trainerId");

  function calculatePeopleFee(
    count: number,
    sId?: string,
    hId?: string,
    tId?: string
  ) {
    const targetServiceId = sId || currentServiceId;
    const targetHallId = hId || watch("hallId");
    const targetTrainerId = tId !== undefined ? tId : currentTrainerId;

    const s = services.find(x => x.id === targetServiceId);
    const d = directions.find(x => x.id === targetServiceId);
    const h = halls.find(x => x.id === targetHallId);

    const sName = s?.name ?? d?.name ?? "";
    const hName = h?.name ?? "";
    const isR = sName.toLowerCase().includes("аренда") || s?.category?.toLowerCase() === "аренда";

    const bPrice = s ? Number(s.price) : 0;
    const incPeople = s?.peopleCount;
    const perPerson = s?.isPerPerson;
    const tiers = s?.priceTiers;

    return calcExtraPeopleFee(
      sName,
      count,
      isR,
      hName,
      incPeople,
      perPerson,
      bPrice,
      tiers
    );
  }

  const { fee: calculatedFee, ruleText } = calculatePeopleFee(peopleCount);

  function handlePeopleChange(count: number) {
    const newCount = Math.max(1, count);
    setPeopleCount(newCount);
    const { fee } = calculatePeopleFee(newCount);
    setValue("extraPeopleFee", fee);
  }

  function handleServiceSelect(serviceId: string) {
    setValue("directionId", serviceId);
    const selected = services.find(s => s.id === serviceId);
    if (selected) {
      setValue("servicePrice", Number(selected.price));
      if (selected.durationMin && Number(selected.durationMin) > 0) {
        setValue("durationMin", Number(selected.durationMin));
      }
      if (selected.hallId && selected.hallId !== "all") {
        setValue("hallId", selected.hallId);
      }
      const { fee } = calculatePeopleFee(peopleCount, serviceId);
      setValue("extraPeopleFee", fee);
    }
  }

  async function handleQuickCreateClient() {
    if (!newFirstName.trim() || !newPhone.trim()) {
      toast({ title: "Заполните имя и телефон клиента", variant: "destructive" });
      return;
    }

    setCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          phone: newPhone.trim(),
        }),
      });

      const data = await res.json();
      setCreatingClient(false);

      if (!res.ok) {
        toast({ title: "Ошибка создания клиента", description: data.error, variant: "destructive" });
        return;
      }

      setSelectedClient(data);
      setValue("clientId", data.id, { shouldValidate: true });
      setShowQuickCreate(false);
      toast({ title: "Клиент создан и выбран" });
    } catch (e: any) {
      setCreatingClient(false);
      toast({ title: "Ошибка сети", description: e.message, variant: "destructive" });
    }
  }

  async function onSubmit(data: FormData) {
    if (!data.clientId) {
      toast({ title: "Выберите клиента", description: "Пожалуйста, выберите клиента для записи", variant: "destructive" });
      return;
    }

    setLoading(true);
    const startAt = new Date(`${data.date}T${data.time}:00`);
    const trainerId = data.trainerId === "none" || !data.trainerId ? null : data.trainerId;

    let validDirectionId = data.directionId;
    const isDirectionExist = directions.some(d => d.id === validDirectionId);
    if (!isDirectionExist && directions[0]) {
      validDirectionId = directions[0].id;
    }

    const res = await fetch("/api/schedule/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        directionId: validDirectionId,
        trainerId,
        startAt: startAt.toISOString(),
      }),
    });

    let json: any = {};
    try {
      const text = await res.text();
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: "Ошибка ответа сервера" };
    }
    setLoading(false);

    if (!res.ok) {
      toast({ title: "Ошибка", description: json.error || "Не удалось создать запись", variant: "destructive" });
      return;
    }

    toast({ title: "Запись добавлена" });
    onCreated();
    onClose();
  }

  const currentHallId = watch("hallId");
  const currentTime = watch("time");
  const currentDuration = watch("durationMin");

  const servicePrice = watch("servicePrice") || 0;
  const extraPeopleFee = watch("extraPeopleFee") || 0;
  const wardrobeFee = watch("wardrobeFee") || 0;
  const prepaymentRaw = watch("prepayment");
  const prepayment = prepaymentRaw ? Number(prepaymentRaw) : 0;

  const totalPrice = Number(servicePrice) + Number(extraPeopleFee) + Number(wardrobeFee);
  const remainingToPay = Math.max(0, totalPrice - prepayment);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая запись съёмки</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Секция выбора или поиска клиента */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Клиент <span className="text-destructive">*</span>
              </Label>
              {!selectedClient && !showQuickCreate && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                  onClick={() => {
                    setShowQuickCreate(true);
                    setNewFirstName(clientSearch);
                  }}
                >
                  <Plus className="h-3 w-3" /> Новый клиент
                </button>
              )}
            </div>

            {selectedClient ? (
              <div className="mt-1.5 flex items-center justify-between p-2.5 border rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                    {selectedClient.firstName[0]}{(selectedClient.lastName || "")[0] || ""}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{selectedClient.lastName} {selectedClient.firstName}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedClient.phone}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    setSelectedClient(null);
                    setValue("clientId", "", { shouldValidate: true });
                    setClientSearch("");
                  }}
                >
                  Сменить
                </Button>
              </div>
            ) : showQuickCreate ? (
              <div className="mt-1.5 p-3 border rounded-lg bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Быстрое создание клиента</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowQuickCreate(false)}
                  >
                    Отмена
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Имя *"
                    className="h-8 text-xs bg-background"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Фамилия"
                    className="h-8 text-xs bg-background"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Телефон (+7...)*"
                  className="h-8 text-xs bg-background"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-8 text-xs font-semibold"
                  disabled={creatingClient}
                  onClick={handleQuickCreateClient}
                >
                  {creatingClient ? "Создаем..." : "Сохранить и выбрать"}
                </Button>
              </div>
            ) : (
              <div className="relative mt-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени или номеру телефона..."
                    className="pl-8 text-xs"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                </div>

                {clientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {clientResults.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedClient(c);
                          setValue("clientId", c.id, { shouldValidate: true });
                          setClientResults([]);
                          setClientSearch("");
                        }}
                      >
                        <span className="font-medium">{c.lastName} {c.firstName}</span>
                        <span className="text-muted-foreground">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}

                {clientSearch.trim().length > 0 && clientResults.length === 0 && !isSearchingClient && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 p-2 text-center text-xs text-muted-foreground rounded-md border bg-popover shadow-md">
                    Клиенты не найдены.{" "}
                    <button
                      type="button"
                      className="text-primary underline font-medium"
                      onClick={() => {
                        setShowQuickCreate(true);
                        setNewFirstName(clientSearch);
                      }}
                    >
                      Создать клиента
                    </button>
                  </div>
                )}
              </div>
            )}

            {errors.clientId && (
              <p className="text-xs text-destructive mt-1">{errors.clientId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дата</Label>
              <Input type="date" {...register("date")} className="mt-1" />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <Label>Время</Label>
              <Select value={currentTime || "09:00"} onValueChange={v => setValue("time", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Время" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && <p className="text-xs text-destructive mt-1">{errors.time.message}</p>}
            </div>
          </div>

          {/* Кнопки выбора зала */}
          <div>
            <Label>Зал</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {halls.map(h => {
                const isSelected = currentHallId === h.id;
                return (
                  <Button
                    key={h.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValue("hallId", h.id)}
                    className={cn(
                      "flex-1 min-w-[100px] transition-all",
                      isSelected && "font-bold shadow-sm"
                    )}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" style={{ background: h.colorHex || "#3B82F6" }} />
                    {h.name}
                  </Button>
                );
              })}
            </div>
            {errors.hallId && <p className="text-xs text-destructive mt-1">{errors.hallId.message}</p>}
          </div>

          {/* Поле Услуга с поиском */}
          <div>
            <Label>Услуга</Label>
            <Select value={currentServiceId || ""} onValueChange={handleServiceSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите услугу" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <div className="p-1.5 sticky top-0 bg-popover z-10 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Поиск услуги..."
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="h-7 pl-8 text-xs bg-background"
                    />
                  </div>
                </div>
                {services.length > 0 ? (
                  filteredServices.length > 0 ? (
                    filteredServices.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span>{s.name}{s.durationMin && s.durationMin > 0 ? ` (${formatDuration(s.durationMin)})` : ""}</span>
                          <span className="font-semibold text-primary">{formatMoney(s.price)} ₸</span>
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-muted-foreground text-center">Услуга не найдена</div>
                  )
                ) : (
                  filteredDirections.length > 0 ? (
                    filteredDirections.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-muted-foreground text-center">Услуга не найдена</div>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.directionId && <p className="text-xs text-destructive mt-1">{errors.directionId.message}</p>}
          </div>

          {/* Фотограф */}
          <div>
            <Label>Фотограф</Label>
            <Select value={currentTrainerId || "none"} onValueChange={v => {
              setValue("trainerId", v);
              const { fee } = calculatePeopleFee(peopleCount, undefined, undefined, v);
              setValue("extraPeopleFee", fee);
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Не назначен" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не назначен</SelectItem>
                {trainers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.user.firstName} {t.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Длительность */}
          <div>
            <Label>Длительность</Label>
            <Select value={String(currentDuration || 60)} onValueChange={v => setValue("durationMin", Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: 30, label: "30 мин" },
                  { value: 45, label: "45 мин" },
                  { value: 60, label: "1 час" },
                  { value: 90, label: "90 мин" },
                  { value: 120, label: "2 часа" },
                  { value: 180, label: "3 часа" },
                ].map(d => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Финансовый блок */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Расчёт стоимости</p>

            <div>
              <Label className="text-xs">Стоимость услуги (₸)</Label>
              <Input type="number" min="0" step="any" {...register("servicePrice")} className="mt-1 bg-background h-8 text-sm font-semibold" />
            </div>

            {/* Количество человек и расчёт доплаты */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Количество человек</Label>
                <span className="text-[11px] text-muted-foreground">{ruleText}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md shrink-0 bg-background h-8 px-1">
                  <button
                    type="button"
                    className="h-full w-6 flex items-center justify-center text-sm font-bold hover:bg-muted rounded transition-colors"
                    onClick={() => handlePeopleChange(peopleCount - 1)}
                    disabled={peopleCount <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={peopleCount}
                    onChange={e => handlePeopleChange(parseInt(e.target.value) || 1)}
                  />
                  <button
                    type="button"
                    className="h-full w-6 flex items-center justify-center text-sm font-bold hover:bg-muted rounded transition-colors"
                    onClick={() => handlePeopleChange(peopleCount + 1)}
                  >
                    +
                  </button>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    {...register("extraPeopleFee")}
                    className="bg-background h-8 text-sm font-semibold"
                    placeholder="Доплата за человека"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Предоплата (₸)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                {...register("prepayment")}
                className="mt-1 bg-background h-8 text-sm font-semibold text-emerald-600 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="pt-2 border-t text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Итого общая стоимость:</span>
                <span className="font-semibold text-foreground">{formatMoney(totalPrice)} ₸</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Внесённая предоплата:</span>
                <span>{formatMoney(prepayment)} ₸</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
                <span>Остаток к оплате при визите:</span>
                <span className="text-base text-primary font-bold">{formatMoney(remainingToPay)} ₸</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Примечание</Label>
            <Input {...register("note")} className="mt-1" placeholder="Необязательно" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={loading}>{loading ? "Сохраняем..." : "Создать запись"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
