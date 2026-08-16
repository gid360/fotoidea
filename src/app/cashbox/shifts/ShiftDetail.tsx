"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatMoney, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  paymentMethod: string;
  amount: string | number;
  description: string | null;
  date: string;
  createdBy: { firstName: string; lastName: string };
}

interface Shift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: string | number;
  income: number;
  expense: number;
  openedBy: { firstName: string; lastName: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION_SALE: "Продажа услуги",
  CERTIFICATE_SALE:  "Продажа сертификата",
  DEPOSIT_TOPUP:     "Пополнение владельцем",
  OTHER_INCOME:      "Прочий доход",
  TRAINER_SALARY:    "Зарплата фотографа",
  HOUSEHOLD:         "Хозрасходы",
  CLIENT_REFUND:     "Возврат клиенту",
  OTHER_EXPENSE:     "Прочий расход",
};

const INCOME_CATS  = ["SUBSCRIPTION_SALE", "CERTIFICATE_SALE", "DEPOSIT_TOPUP", "OTHER_INCOME"];
const EXPENSE_CATS = ["TRAINER_SALARY", "HOUSEHOLD", "CLIENT_REFUND", "OTHER_EXPENSE"];

const PAYMENT_LABELS: Record<string, string> = {
  KASPI:   "Kaspi",
  HALYK:   "Halyk",
  CASH:    "Наличные",
  MIXED:   "Смешанная",
  CARD:    "Карта / QR",
  DEPOSIT: "Депозит",
};

export function ShiftDetail({ shift, onBack }: { shift: Shift; onBack: () => void }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    type:          "INCOME" as "INCOME" | "EXPENSE",
    category:      "OTHER_INCOME",
    paymentMethod: "KASPI" as string,
    amount:        "",
    cashAmount:    "",
    nonCashAmount: "",
    nonCashMethod: "KASPI" as "KASPI" | "HALYK",
    description:   "",
  });

  const { data: transactions = [], refetch } = useQuery<Transaction[]>({
    queryKey: ["shift-transactions", shift.id],
    queryFn: () => fetch(`/api/cashbox/transactions?shiftId=${shift.id}`).then(r => r.json()),
  });

  const income  = transactions.filter(t => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);
  const balance = Number(shift.openingBalance) + income - expense;

  function changeType(type: "INCOME" | "EXPENSE") {
    setForm(f => ({
      ...f,
      type,
      category: type === "INCOME" ? "OTHER_INCOME" : "OTHER_EXPENSE",
      paymentMethod: type === "INCOME" ? "KASPI" : "CASH",
    }));
  }

  function handleSelectPaymentMethod(method: string) {
    setForm(f => {
      const updated = { ...f, paymentMethod: method };
      if (method === "MIXED") {
        const total = Number(f.amount) || 0;
        if (total > 0) {
          const half = Math.round(total / 2);
          updated.cashAmount = String(half);
          updated.nonCashAmount = String(total - half);
        }
      }
      return updated;
    });
  }

  function handleCashChange(val: string) {
    setForm(f => {
      const cash = Number(val) || 0;
      const total = Number(f.amount) || 0;
      const nonCash = total >= cash ? String(total - cash) : f.nonCashAmount;
      return { ...f, cashAmount: val, nonCashAmount: nonCash };
    });
  }

  function handleNonCashChange(val: string) {
    setForm(f => {
      const nonCash = Number(val) || 0;
      const total = Number(f.amount) || 0;
      const cash = total >= nonCash ? String(total - nonCash) : f.cashAmount;
      return { ...f, nonCashAmount: val, cashAmount: cash };
    });
  }

  async function addTx() {
    const total = Number(form.amount);
    if (!total || total <= 0) return;

    if (form.paymentMethod === "MIXED") {
      const cash = Number(form.cashAmount) || 0;
      const nonCash = Number(form.nonCashAmount) || 0;
      if (cash <= 0 || nonCash <= 0) {
        toast({ title: "Укажите суммы для наличных и безналичных", variant: "destructive" });
        return;
      }
      if (cash + nonCash !== total) {
        toast({ title: `Сумма частей (${cash + nonCash} ₸) не совпадает с общей (${total} ₸)`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    const payload: any = {
      shiftId: shift.id,
      type: form.type,
      category: form.category,
      paymentMethod: form.paymentMethod,
      amount: total,
      description: form.description,
    };

    if (form.paymentMethod === "MIXED") {
      payload.splits = [
        { paymentMethod: "CASH", amount: Number(form.cashAmount) },
        { paymentMethod: form.nonCashMethod, amount: Number(form.nonCashAmount) },
      ];
    }

    const res = await fetch("/api/cashbox/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Операция добавлена" });
    setAddOpen(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["shifts"] });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <div className="p-4 border-b bg-background shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Назад к сменам
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Смена {format(new Date(shift.openedAt), "d MMMM yyyy", { locale: ru })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {shift.openedBy.firstName} {shift.openedBy.lastName} ·{" "}
              {format(new Date(shift.openedAt), "HH:mm")}
              {shift.closedAt ? ` — ${format(new Date(shift.closedAt), "HH:mm")}` : " (открыта)"}
            </p>
          </div>
          {!shift.closedAt && (
            <Button onClick={() => { setAddOpen(true); setForm(f => ({ ...f, type: "INCOME", category: "OTHER_INCOME", amount: "", description: "" })); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Добавить операцию
            </Button>
          )}
        </div>

        {/* Итоги */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Открытие", value: Number(shift.openingBalance), color: "" },
            { label: "Приход",   value: income,   color: "text-green-600", prefix: "+" },
            { label: "Расход",   value: expense,  color: "text-red-500",   prefix: "−" },
            { label: "Баланс",   value: balance,  color: "font-bold" },
          ].map(item => (
            <div key={item.label} className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-lg font-semibold mt-0.5", item.color)}>
                {item.prefix}{formatMoney(item.value)} ₸
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Список операций */}
      <div className="flex-1 overflow-auto">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p>Операций ещё нет</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Время</th>
                <th className="text-left px-4 py-2.5 font-medium">Категория</th>
                <th className="text-left px-4 py-2.5 font-medium">Описание</th>
                <th className="text-left px-4 py-2.5 font-medium">Оплата</th>
                <th className="text-right px-4 py-2.5 font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(tx.date), "HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tx.type === "INCOME"
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <span className="text-sm">{CATEGORY_LABELS[tx.category] ?? tx.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tx.description ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}</td>
                  <td className={cn("px-4 py-3 text-right font-semibold text-sm",
                    tx.type === "INCOME" ? "text-green-600" : "text-red-500")}>
                    {tx.type === "INCOME" ? "+" : "−"}{formatMoney(tx.amount)} ₸
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Диалог добавления операции */}
      <Dialog open={addOpen} onOpenChange={v => !v && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новая операция</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Тип */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => changeType("INCOME")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 border rounded-lg text-sm font-medium transition-colors",
                  form.type === "INCOME" ? "border-green-500 bg-green-50 text-green-700" : "hover:bg-muted"
                )}>
                <TrendingUp className="h-4 w-4" /> Приход
              </button>
              <button
                onClick={() => changeType("EXPENSE")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 border rounded-lg text-sm font-medium transition-colors",
                  form.type === "EXPENSE" ? "border-red-400 bg-red-50 text-red-600" : "hover:bg-muted"
                )}>
                <TrendingDown className="h-4 w-4" /> Расход
              </button>
            </div>

            <div>
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "INCOME" ? INCOME_CATS : EXPENSE_CATS).map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Общая сумма (₸)</Label>
                <Input className="mt-1" type="number" min="0.01" step="any"
                  value={form.amount} onChange={e => {
                    const val = e.target.value;
                    setForm(f => {
                      const updated = { ...f, amount: val };
                      if (f.paymentMethod === "MIXED") {
                        const total = Number(val) || 0;
                        const cash = Number(f.cashAmount) || 0;
                        if (total >= cash) {
                          updated.nonCashAmount = String(total - cash);
                        }
                      }
                      return updated;
                    });
                  }} />
              </div>
              <div>
                <Label>Способ оплаты</Label>
                <Select value={form.paymentMethod} onValueChange={handleSelectPaymentMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KASPI">Kaspi</SelectItem>
                    <SelectItem value="HALYK">Halyk</SelectItem>
                    <SelectItem value="CASH">Наличные</SelectItem>
                    <SelectItem value="MIXED">Смешанная</SelectItem>
                    <SelectItem value="CARD">Карта / QR</SelectItem>
                    <SelectItem value="DEPOSIT">Депозит</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.paymentMethod === "MIXED" && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                  <span>Разделение оплаты:</span>
                  <span className="font-mono">
                    Всего: {Number(form.amount) || 0} ₸
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Наличные (₸)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.cashAmount}
                      onChange={e => handleCashChange(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Безналичные (₸)</Label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, nonCashMethod: "KASPI" }))}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold transition-all",
                            form.nonCashMethod === "KASPI"
                              ? "bg-red-500 text-white"
                              : "text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          Kaspi
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, nonCashMethod: "HALYK" }))}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold transition-all",
                            form.nonCashMethod === "HALYK"
                              ? "bg-emerald-600 text-white"
                              : "text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          Halyk
                        </button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.nonCashAmount}
                      onChange={e => handleNonCashChange(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Описание</Label>
              <Input className="mt-1" placeholder="Необязательно"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={addTx} disabled={saving || !form.amount}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
