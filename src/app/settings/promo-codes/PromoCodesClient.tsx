"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Plus, Trash2, Pencil, Check, X, RefreshCw,
  Percent, BadgeDollarSign, CalendarClock, Infinity, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface PromoCode {
  id: string;
  code: string;
  type: "FIXED" | "PERCENT";
  value: string | number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
}

type LimitMode = "once" | "twice" | "custom" | "unlimited";

const LIMIT_OPTIONS: { label: string; value: LimitMode }[] = [
  { label: "1 раз",         value: "once"      },
  { label: "2 раза",        value: "twice"     },
  { label: "Задать кол-во", value: "custom"    },
  { label: "Без лимита",    value: "unlimited" },
];

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function promoStatus(p: PromoCode): { label: string; className: string } {
  if (!p.isActive) return { label: "Отключён",  className: "bg-gray-100 text-gray-500" };
  if (p.expiresAt && isPast(parseISO(p.expiresAt)))
    return { label: "Истёк",    className: "bg-red-100 text-red-600" };
  if (p.maxUses !== null && p.usedCount >= p.maxUses)
    return { label: "Исчерпан", className: "bg-orange-100 text-orange-600" };
  return { label: "Активен",   className: "bg-emerald-100 text-emerald-700" };
}

function promoValue(p: PromoCode) {
  return p.type === "PERCENT"
    ? `${p.value}%`
    : `${formatMoney(p.value)} ₸`;
}

function usesLabel(p: PromoCode) {
  if (p.maxUses === null) return "∞";
  return `${p.usedCount} / ${p.maxUses}`;
}

// ─── Форма создания / редактирования ─────────────────────────
interface FormState {
  code: string;
  type: "FIXED" | "PERCENT";
  value: string;
  limitMode: LimitMode;
  customLimit: string;
  expiresAt: string;
  note: string;
}

const DEFAULT_FORM: FormState = {
  code: "",
  type: "PERCENT",
  value: "",
  limitMode: "once",
  expiresAt: "",
  customLimit: "",
  note: "",
};

function PromoForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);
  const set = (patch: Partial<FormState>) => setF(p => ({ ...p, ...patch }));

  const maxUses =
    f.limitMode === "once"      ? 1
    : f.limitMode === "twice"   ? 2
    : f.limitMode === "custom"  ? (Number(f.customLimit) || null)
    : null;

  const valid = f.code.length >= 2 && Number(f.value) > 0
    && (f.limitMode !== "custom" || Number(f.customLimit) > 0);

  return (
    <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
      {/* Код */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Промокод</label>
          <Input
            value={f.code}
            onChange={e => set({ code: e.target.value.toUpperCase() })}
            placeholder="SUMMER25"
            className="font-mono uppercase"
            maxLength={32}
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0"
          onClick={() => set({ code: genCode() })}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Сгенерировать
        </Button>
      </div>

      {/* Тип + Значение */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип скидки</label>
          <div className="flex gap-1.5">
            {(["PERCENT", "FIXED"] as const).map(t => (
              <button key={t} type="button"
                onClick={() => set({ type: t })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-2 text-sm transition-colors",
                  f.type === t ? "border-primary bg-primary/5 font-medium text-primary" : "hover:bg-muted/50"
                )}>
                {t === "PERCENT"
                  ? <><Percent className="h-3.5 w-3.5" /> Процент</>
                  : <><BadgeDollarSign className="h-3.5 w-3.5" /> Фиксированная</>}
              </button>
            ))}
          </div>
        </div>
        <div className="w-36">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {f.type === "PERCENT" ? "Процент (%)" : "Сумма (₸)"}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={f.value}
              onChange={e => set({ value: e.target.value })}
              placeholder={f.type === "PERCENT" ? "10" : "5000"}
              min={0}
              max={f.type === "PERCENT" ? 100 : undefined}
              className="pr-7"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {f.type === "PERCENT" ? "%" : "₸"}
            </span>
          </div>
        </div>
      </div>

      {/* Лимит использований */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Лимит использований</label>
        <div className="flex gap-1.5 flex-wrap">
          {LIMIT_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => set({ limitMode: opt.value })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors",
                f.limitMode === opt.value ? "border-primary bg-primary/5 font-medium text-primary" : "hover:bg-muted/50"
              )}>
              {opt.value === "unlimited" && <Infinity className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
        {f.limitMode === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              value={f.customLimit}
              onChange={e => set({ customLimit: e.target.value })}
              placeholder="Количество раз"
              className="w-40 h-8 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">раз</span>
          </div>
        )}
      </div>

      {/* Срок действия */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" /> Срок действия (не обязательно)
        </label>
        <Input
          type="date"
          value={f.expiresAt}
          onChange={e => set({ expiresAt: e.target.value })}
          className="w-44 text-sm"
        />
        {f.expiresAt && (
          <button type="button" onClick={() => set({ expiresAt: "" })}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground">
            Убрать
          </button>
        )}
      </div>

      {/* Примечание */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Примечание</label>
        <Input
          value={f.note}
          onChange={e => set({ note: e.target.value })}
          placeholder="Для чего создан промокод..."
          maxLength={200}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave({ ...f, code: f.code.toUpperCase() })}
          disabled={!valid || saving} size="sm">
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────
export function PromoCodesClient() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const { data: codes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ["promo-codes"],
    queryFn:  () => fetch("/api/settings/promo-codes").then(r => r.json()),
  });

  function formFromPromo(p: PromoCode): FormState {
    const lm: LimitMode = p.maxUses === null ? "unlimited"
      : p.maxUses === 1 ? "once"
      : p.maxUses === 2 ? "twice"
      : "custom";
    return {
      code:        p.code,
      type:        p.type,
      value:       String(p.value),
      limitMode:   lm,
      customLimit: p.maxUses !== null && lm === "custom" ? String(p.maxUses) : "",
      expiresAt:   p.expiresAt ? p.expiresAt.slice(0, 10) : "",
      note:        p.note ?? "",
    };
  }

  function maxUsesFromForm(f: FormState): number | null {
    if (f.limitMode === "once")      return 1;
    if (f.limitMode === "twice")     return 2;
    if (f.limitMode === "custom")    return Number(f.customLimit) || null;
    return null;
  }

  async function handleCreate(f: FormState) {
    setSaving(true);
    const res = await fetch("/api/settings/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:      f.code,
        type:      f.type,
        value:     Number(f.value),
        maxUses:   maxUsesFromForm(f),
        expiresAt: f.expiresAt || null,
        note:      f.note || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: err.error ?? "Ошибка", variant: "destructive" }); return;
    }
    toast({ title: "Промокод создан" });
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["promo-codes"] });
  }

  async function handleEdit(f: FormState) {
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/settings/promo-codes/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:      f.type,
        value:     Number(f.value),
        maxUses:   maxUsesFromForm(f),
        expiresAt: f.expiresAt || null,
        note:      f.note || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Сохранено" });
    setEditId(null);
    qc.invalidateQueries({ queryKey: ["promo-codes"] });
  }

  async function toggleActive(p: PromoCode) {
    await fetch(`/api/settings/promo-codes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["promo-codes"] });
  }

  async function deleteCode(p: PromoCode) {
    if (!confirm(`Удалить промокод ${p.code}?`)) return;
    await fetch(`/api/settings/promo-codes/${p.id}`, { method: "DELETE" });
    toast({ title: `Промокод ${p.code} удалён` });
    qc.invalidateQueries({ queryKey: ["promo-codes"] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Скидки и промокоды</h1>
          <p className="text-sm text-muted-foreground">Создавайте промокоды с фиксированной суммой или процентом</p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => { setCreating(true); setEditId(null); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Создать промокод
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-3xl">

        {/* Форма создания */}
        {creating && (
          <PromoForm
            initial={{ ...DEFAULT_FORM, code: genCode() }}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        )}

        {/* Список */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border bg-muted/30 animate-pulse" />)}
          </div>
        )}

        {!isLoading && codes.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Percent className="h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Нет промокодов</p>
            <p className="text-sm mt-1">Нажмите «Создать промокод» чтобы добавить первый</p>
          </div>
        )}

        {codes.map(p => {
          const status = promoStatus(p);
          const isEditing = editId === p.id;

          if (isEditing) {
            return (
              <PromoForm
                key={p.id}
                initial={formFromPromo(p)}
                onSave={handleEdit}
                onCancel={() => setEditId(null)}
                saving={saving}
              />
            );
          }

          return (
            <div key={p.id} className={cn(
              "border rounded-xl p-4 transition-opacity",
              !p.isActive && "opacity-55"
            )}>
              <div className="flex items-start gap-3">
                {/* Иконка типа */}
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  p.type === "PERCENT" ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"
                )}>
                  {p.type === "PERCENT"
                    ? <Percent className="h-5 w-5" />
                    : <BadgeDollarSign className="h-5 w-5" />}
                </div>

                {/* Данные */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base tracking-wider">{p.code}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.className)}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    {/* Скидка */}
                    <span className="text-sm font-semibold text-primary">
                      −{promoValue(p)}
                    </span>

                    {/* Использования */}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      {p.maxUses === null
                        ? <><Infinity className="h-3.5 w-3.5" /> Без лимита — использ. {p.usedCount}</>
                        : <><Hash className="h-3.5 w-3.5" /> {usesLabel(p)} использований</>}
                    </span>

                    {/* Срок */}
                    {p.expiresAt && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        до {format(parseISO(p.expiresAt), "d MMM yyyy", { locale: ru })}
                      </span>
                    )}
                  </div>

                  {p.note && (
                    <p className="text-xs text-muted-foreground mt-1">{p.note}</p>
                  )}
                </div>

                {/* Действия */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={p.isActive}
                    onCheckedChange={() => toggleActive(p)}
                    title={p.isActive ? "Отключить" : "Включить"}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setEditId(p.id); setCreating(false); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteCode(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
