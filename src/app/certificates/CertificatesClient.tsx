"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Gift, Check, X, Copy, CheckCheck, FileText, Palette } from "lucide-react";
import { CertificateTemplateEditor } from "./CertificateTemplateEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { cn, formatMoney, formatDate } from "@/lib/utils";
import { addDays } from "date-fns";
import { toast } from "@/lib/use-toast";

interface Certificate {
  id: string;
  code: string;
  type: "NOMINAL" | "PACKAGE";
  status: "SOLD" | "ACTIVATED" | "EXPIRED";
  nominalAmount: string | number | null;
  planId: string | null;
  planName: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  peopleCount?: number | null;
  expiresAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; phone: string } | null;
}

interface Plan {
  id: string;
  name: string;
  category?: string | null;
  price: string | number;
  peopleCount?: number | null;
  isActive: boolean;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const STATUS_CONFIG = {
  SOLD:      { label: "Продан",      className: "bg-blue-100 text-blue-700" },
  ACTIVATED: { label: "Активирован", className: "bg-green-100 text-green-700" },
  EXPIRED:   { label: "Истёк",       className: "bg-gray-100 text-gray-500" },
};

export function CertificatesClient() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState<Certificate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Форма создания
  const [form, setForm] = useState({
    type: "PACKAGE" as "NOMINAL" | "PACKAGE",
    nominalAmount: "",
    planId: "",
    buyerName: "",
    buyerPhone: "",
    recipientText: "",
    validDays: "90",
    peopleCount: "1",
    pricePaid: "",
    paymentMethod: "KASPI" as string,
  });

  const [categoryFilter, setCategoryFilter] = useState("");

  // Форма активации
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: certs = [], refetch } = useQuery<Certificate[]>({
    queryKey: ["certificates", search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("q", search);
      if (statusFilter) p.set("status", statusFilter);
      return fetch(`/api/certificates?${p}`).then(r => r.json());
    },
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => fetch("/api/subscriptions/plans").then(r => r.json()),
  });

  const { data: clientResults = [] } = useQuery<Client[]>({
    queryKey: ["client-search", clientQuery],
    queryFn: () => clientQuery.length > 1
      ? fetch(`/api/clients?q=${encodeURIComponent(clientQuery)}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.clients || []))
      : Promise.resolve([]),
    enabled: clientQuery.length > 1,
  });

  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  const { data: buyerSearchResults = [] } = useQuery<Client[]>({
    queryKey: ["buyer-search", form.buyerPhone],
    queryFn: () => form.buyerPhone.replace(/\D/g, "").length >= 2
      ? fetch(`/api/clients?q=${encodeURIComponent(form.buyerPhone)}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.clients || []))
      : Promise.resolve([]),
    enabled: form.buyerPhone.replace(/\D/g, "").length >= 2,
  });

  const [planSearch, setPlanSearch] = useState("");

  const activePlans = plans.filter(p => p.isActive);

  function openCreate() {
    const firstPlan = activePlans[0];
    const firstPlanId = firstPlan?.id || "";
    const autoPrice = firstPlan ? String(firstPlan.price || "") : "";
    const autoPeople = firstPlan ? String(firstPlan.peopleCount || 1) : "1";

    setForm({
      type: "PACKAGE",
      nominalAmount: "",
      planId: firstPlanId,
      buyerName: "",
      buyerPhone: "",
      recipientText: "",
      validDays: "90",
      peopleCount: autoPeople,
      pricePaid: autoPrice,
      paymentMethod: "CASH",
    });
    setPlanSearch("");
    setShowBuyerDropdown(false);
    setCreateOpen(true);
  }

  async function create() {
    setSaving(true);
    try {
      const cleanPriceStr = String(form.pricePaid || "").replace(/\s+/g, "");
      const cleanPrice = cleanPriceStr ? Number(cleanPriceStr) : null;

      const cleanNominalStr = String(form.nominalAmount || "").replace(/\s+/g, "");
      const cleanNominal = cleanNominalStr ? Number(cleanNominalStr) : null;

      const cleanDays = form.validDays ? Number(form.validDays) : 90;
      const cleanPeople = form.peopleCount && Number(form.peopleCount) > 0 ? Number(form.peopleCount) : null;

      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          nominalAmount: form.type === "NOMINAL" ? cleanNominal : null,
          planId: form.type === "PACKAGE" && form.planId ? form.planId : null,
          buyerName: form.buyerName?.trim() || null,
          buyerPhone: form.buyerPhone?.trim() || null,
          recipientText: form.recipientText?.trim() || null,
          validDays: cleanDays,
          peopleCount: cleanPeople,
          pricePaid: cleanPrice,
          paymentMethod: cleanPrice && cleanPrice > 0 ? form.paymentMethod : null,
        }),
      });
      setSaving(false);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast({ title: errData.error || "Ошибка создания сертификата", variant: "destructive" });
        return;
      }
      const cert = await res.json();
      toast({ title: `Сертификат создан: ${cert.code}` });
      if (cert?.id) {
        window.open(`/api/certificates/${cert.id}/pdf?t=${Date.now()}`, "_blank");
      }
      setCreateOpen(false);
      refetch();
    } catch (err: any) {
      setSaving(false);
      toast({ title: err.message || "Ошибка сети при создании", variant: "destructive" });
    }
  }

  async function activate() {
    if (!activateOpen || !selectedClient) return;
    setSaving(true);
    const res = await fetch(`/api/certificates/${activateOpen.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", clientId: selectedClient.id }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      toast({ title: e.error ?? "Ошибка", variant: "destructive" });
      return;
    }
    toast({ title: "Сертификат активирован" });
    setActivateOpen(null);
    refetch();
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function expire(cert: Certificate) {
    if (!confirm(`Пометить сертификат ${cert.code} как истёкший?`)) return;
    await fetch(`/api/certificates/${cert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "expire" }),
    });
    refetch();
  }

  function copyCode(cert: Certificate) {
    navigator.clipboard.writeText(cert.code);
    setCopiedId(cert.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <div className="p-4 border-b bg-background shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Сертификаты</h1>
            <p className="text-sm text-muted-foreground">{certs.length} записей</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(true)}>
              <Palette className="h-4 w-4 mr-1.5 text-amber-500" /> Шаблон дизайна (10×15 см)
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Создать сертификат
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск по коду, покупателю..." className="pl-9"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {[
              { value: "",          label: "Все" },
              { value: "SOLD",      label: "Проданные" },
              { value: "ACTIVATED", label: "Активированные" },
              { value: "EXPIRED",   label: "Истёкшие" },
            ].map(f => (
              <button key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  statusFilter === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-muted"
                )}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-auto">
        {certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Gift className="h-12 w-12 mb-3 opacity-30" />
            <p>Сертификатов не найдено</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Создать первый</Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Код</th>
                <th className="text-left px-4 py-2.5 font-medium">Тип / Номинал</th>
                <th className="text-left px-4 py-2.5 font-medium">Покупатель</th>
                <th className="text-left px-4 py-2.5 font-medium">Статус</th>
                <th className="text-left px-4 py-2.5 font-medium">Активирован на</th>
                <th className="text-left px-4 py-2.5 font-medium">Истекает</th>
                <th className="text-right px-4 py-2.5 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {certs.map(cert => {
                const sc = STATUS_CONFIG[cert.status];
                return (
                  <tr key={cert.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold">{cert.code}</span>
                        <button onClick={() => copyCode(cert)}
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          {copiedId === cert.id
                            ? <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cert.type === "NOMINAL" ? (
                        <div>
                          <p className="text-sm font-medium">Номинальный</p>
                          <p className="text-xs text-muted-foreground">{formatMoney(cert.nominalAmount ?? 0)} ₸ на депозит</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium">Пакетный</p>
                          <p className="text-xs text-muted-foreground">{cert.planName ?? "—"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cert.buyerName ? (
                        <div>
                          <p className="text-sm">{cert.buyerName}</p>
                          {cert.buyerPhone && <p className="text-xs text-muted-foreground">{cert.buyerPhone}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.className)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {cert.client ? (
                        <div>
                          <p className="text-sm">{cert.client.lastName} {cert.client.firstName}</p>
                          <p className="text-xs text-muted-foreground">{cert.activatedAt ? formatDate(cert.activatedAt) : ""}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {cert.expiresAt ? formatDate(cert.expiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => window.open(`/api/certificates/${cert.id}/pdf?t=${Date.now()}`, "_blank")}>
                          <FileText className="h-3.5 w-3.5 mr-1 text-red-500" /> PDF
                        </Button>
                        {cert.status === "SOLD" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => { setSelectedClient(null); setClientQuery(""); setActivateOpen(cert); }}>
                              Активировать
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                              onClick={() => expire(cert)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Диалог создания */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift className="h-4 w-4" /> Новый сертификат</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Тип сертификата</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {([["NOMINAL", "Номинальный", "Зачисляет сумму на депозит"], ["PACKAGE", "Пакетный", "Дарит конкретный абонемент"]] as const).map(([v, label, desc]) => (
                  <button key={v}
                    onClick={() => setForm(f => ({ ...f, type: v }))}
                    className={cn(
                      "text-left p-3 border rounded-lg transition-colors",
                      form.type === v ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.type === "NOMINAL" ? (
              <div>
                <Label>Сумма номинала (₸)</Label>
                <Input className="mt-1" type="number" min="0.01" step="any" placeholder="5000"
                  value={form.nominalAmount}
                  onChange={e => setForm(f => ({ ...f, nominalAmount: e.target.value }))} />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Услуга</Label>
                  <Select
                    value={form.planId}
                    onValueChange={v => {
                      const chosen = activePlans.find(p => p.id === v);
                      setForm(f => ({
                        ...f,
                        planId: v,
                        pricePaid: chosen ? String(chosen.price || "") : f.pricePaid,
                        peopleCount: chosen ? String(chosen.peopleCount || 1) : f.peopleCount,
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                        <Input
                          placeholder="Поиск услуги..."
                          value={planSearch}
                          onChange={e => setPlanSearch(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          className="h-8 text-xs"
                        />
                      </div>
                      {activePlans
                        .filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase()))
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({formatMoney(p.price)} ₸)</SelectItem>
                        ))}
                      {activePlans.filter(p => p.name.toLowerCase().includes(planSearch.toLowerCase())).length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">Услуги не найдены</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Количество человек</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={form.peopleCount}
                    onChange={e => setForm(f => ({ ...f, peopleCount: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Заполняется, если хотят подарить сертификат на большее количество человек, чем входит в стандартный пакет
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Label>Телефон покупателя</Label>
                <Input
                  className="mt-1"
                  placeholder="+7 700 000 0000"
                  value={form.buyerPhone}
                  onChange={e => {
                    setForm(f => ({ ...f, buyerPhone: e.target.value }));
                    setShowBuyerDropdown(true);
                  }}
                  onFocus={() => setShowBuyerDropdown(true)}
                />
                {showBuyerDropdown && buyerSearchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                    {buyerSearchResults.map((c: Client) => {
                      const name = `${c.lastName || ""} ${c.firstName || ""}`.trim();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted text-xs transition-colors flex items-center justify-between"
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              buyerPhone: c.phone,
                              buyerName: name || f.buyerName,
                            }));
                            setShowBuyerDropdown(false);
                          }}
                        >
                          <span className="font-medium">{c.phone}</span>
                          <span className="text-muted-foreground">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label>Покупатель (имя)</Label>
                <Input
                  className="mt-1"
                  placeholder="Иванов Иван"
                  value={form.buyerName}
                  onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Кастомизация (От кого / Для кого)</Label>
              <Input
                className="mt-1"
                placeholder="Например: Любимой маме от Екатерины"
                value={form.recipientText}
                onChange={e => setForm(f => ({ ...f, recipientText: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Отобразится на сертификате над номером № XXXXXX
              </p>
            </div>

            <div>
              <Label>Срок действия (дней)</Label>
              <Select value={form.validDays} onValueChange={v => setForm(f => ({ ...f, validDays: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">3 месяца (90 дней)</SelectItem>
                  <SelectItem value="180">6 месяцев (180 дней)</SelectItem>
                  <SelectItem value="365">1 год (365 дней)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <span>Действителен до:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(addDays(new Date(), Number(form.validDays) || 90))}
                </span>
              </p>
            </div>

            <div>
              <Label>Сумма продажи (₸) - для записи в кассу</Label>
              <Input className="mt-1" type="number" min="0" step="any" placeholder="0 - не записывать"
                value={form.pricePaid}
                onChange={e => setForm(f => ({ ...f, pricePaid: e.target.value }))} />
            </div>

            {form.pricePaid && Number(form.pricePaid) > 0 && (
              <div>
                <Label>Способ оплаты</Label>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "KASPI", label: "Kaspi" },
                    { id: "HALYK", label: "Halyk" },
                    { id: "CASH",  label: "Наличные" },
                    { id: "MIXED", label: "Смешанная" },
                  ].map(m => (
                    <button key={m.id} type="button"
                      onClick={() => setForm(f => ({ ...f, paymentMethod: m.id }))}
                      className={cn(
                        "border rounded-lg px-2.5 py-1.5 text-xs transition-colors font-medium text-center",
                        form.paymentMethod === m.id ? "border-primary bg-primary text-primary-foreground font-semibold shadow-2xs" : "hover:bg-muted/50 border-slate-200 dark:border-slate-800"
                      )}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={create} disabled={saving ||
              (form.type === "NOMINAL" && !form.nominalAmount) ||
              (form.type === "PACKAGE" && !form.planId)}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог активации */}
      <Dialog open={!!activateOpen} onOpenChange={v => !v && setActivateOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Активировать сертификат</DialogTitle>
          </DialogHeader>

          {activateOpen && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Сертификат</p>
                <p className="font-mono font-bold text-lg">{activateOpen.code}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activateOpen.type === "NOMINAL"
                    ? `Номинал: ${formatMoney(activateOpen.nominalAmount ?? 0)} ₸ → зачислится на депозит`
                    : `Абонемент: ${activateOpen.planName ?? "—"} → будет создан`}
                </p>
              </div>

              <div>
                <Label>Клиент-получатель</Label>
                {selectedClient ? (
                  <div className="mt-1 flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedClient.lastName} {selectedClient.firstName}</p>
                      <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Поиск клиента..." className="pl-9"
                      value={clientQuery} onChange={e => setClientQuery(e.target.value)} />
                    {clientResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                        {clientResults.map((c: Client) => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                            onClick={() => { setSelectedClient(c); setClientQuery(""); }}>
                            <span className="font-medium">{c.lastName} {c.firstName}</span>
                            <span className="text-muted-foreground ml-2">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(null)}>Отмена</Button>
            <Button onClick={activate} disabled={saving || !selectedClient}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Активация..." : "Активировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CertificateTemplateEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
