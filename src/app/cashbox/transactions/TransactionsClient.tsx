"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrendingUp, TrendingDown, Search, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatMoney } from "@/lib/utils";
import { PageTabs } from "@/components/PageTabs";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/use-toast";

const CASH_TABS = [
  { label: "Операции", href: "/cashbox/transactions" },
  { label: "Смены", href: "/cashbox/shifts" },
];

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

const CATEGORY_LABELS: Record<string, string> = {
  SUBSCRIPTION_SALE: "Продажа услуги",
  CERTIFICATE_SALE:  "Продажа сертификата",
  DEPOSIT_TOPUP:     "Пополнение владельцем",
  OTHER_INCOME:      "Прочий приход",
  TRAINER_SALARY:    "Зарплата / выплата фотографу",
  HOUSEHOLD:         "Хозрасходы",
  CLIENT_REFUND:     "Возврат клиенту",
  OTHER_EXPENSE:     "Выдача владельцу / прочий расход",
};

const PAYMENT_LABELS: Record<string, string> = {
  KASPI:   "Kaspi",
  HALYK:   "Halyk",
  CASH:    "Наличные",
  MIXED:   "Смешанная",
  CARD:    "Карта / QR",
  DEPOSIT: "Депозит",
};

export function TransactionsClient() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [typeFilter, setTypeFilter] = useState("");

  // Modal for manual Income / Expense
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [txCategory, setTxCategory] = useState<string>("OTHER_INCOME");
  const [txPaymentMethod, setTxPaymentMethod] = useState<string>("KASPI");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txDescription, setTxDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: transactions = [], refetch } = useQuery<Transaction[]>({
    queryKey: ["transactions", dateFrom, dateTo, typeFilter],
    queryFn: () => {
      const p = new URLSearchParams({ from: dateFrom, to: dateTo });
      if (typeFilter) p.set("type", typeFilter);
      return fetch(`/api/cashbox/transactions?${p}`).then(r => r.json());
    },
  });

  function openModal(type: "INCOME" | "EXPENSE") {
    setTxType(type);
    setTxCategory(type === "INCOME" ? "OTHER_INCOME" : "TRAINER_SALARY");
    setTxPaymentMethod("CASH");
    setTxAmount("");
    setTxDescription("");
    setTxDialogOpen(true);
  }

  async function handleCreateTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/cashbox/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          category: txCategory,
          paymentMethod: txPaymentMethod,
          amount: Number(txAmount),
          description: txDescription,
        }),
      });

      if (res.ok) {
        toast({ title: txType === "INCOME" ? "Приход внесён в кассу" : "Расход / выплата проведена" });
        setTxDialogOpen(false);
        refetch();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Ошибка проведения операции", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const income  = transactions.filter(t => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const day = format(new Date(tx.date), "d MMMM yyyy", { locale: ru });
    if (!acc[day]) acc[day] = [];
    acc[day].push(tx);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <PageTabs tabs={CASH_TABS} />
      <div className="p-4 border-b bg-background shrink-0 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">Операции кассы</h1>
            <p className="text-sm text-muted-foreground">{transactions.length} операций</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openModal("INCOME")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
            >
              <TrendingUp className="h-4 w-4 mr-1.5" /> + Приход в кассу
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal("EXPENSE")}
              className="border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-xs shadow-xs"
            >
              <TrendingDown className="h-4 w-4 mr-1.5 text-rose-600" /> - Расход / Выдача
            </Button>
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">С</Label>
            <Input type="date" className="mt-1 h-8 w-36 text-sm"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">По</Label>
            <Input type="date" className="mt-1 h-8 w-36 text-sm"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {[
              { value: "",        label: "Все" },
              { value: "INCOME",  label: "Приход" },
              { value: "EXPENSE", label: "Расход" },
            ].map(f => (
              <button key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors h-8",
                  typeFilter === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-muted"
                )}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Итоги периода */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" /> Приход
            </p>
            <p className="text-lg font-semibold text-green-600 mt-0.5">+{formatMoney(income)} ₸</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-400" /> Расход
            </p>
            <p className="text-lg font-semibold text-red-500 mt-0.5">−{formatMoney(expense)} ₸</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Итого
            </p>
            <p className={cn("text-lg font-semibold mt-0.5",
              income - expense >= 0 ? "text-foreground" : "text-red-500")}>
              {income - expense >= 0 ? "+" : ""}{formatMoney(income - expense)} ₸
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
            <p>Операций за период не найдено</p>
          </div>
        ) : (
          <div className="divide-y">
            {Object.entries(grouped).map(([day, txs]) => {
              const dayIncome  = txs.filter(t => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
              const dayExpense = txs.filter(t => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);
              return (
                <div key={day}>
                  <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day}</span>
                    <div className="flex gap-4 text-xs">
                      {dayIncome  > 0 && <span className="text-green-600">+{formatMoney(dayIncome)} ₸</span>}
                      {dayExpense > 0 && <span className="text-red-500">−{formatMoney(dayExpense)} ₸</span>}
                    </div>
                  </div>
                  {txs.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        tx.type === "INCOME" ? "bg-green-100" : "bg-red-100"
                      )}>
                        {tx.type === "INCOME"
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{CATEGORY_LABELS[tx.category] ?? tx.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), "HH:mm")} · {PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
                          {tx.description && ` · ${tx.description}`}
                        </p>
                      </div>
                      <span className={cn("text-sm font-semibold shrink-0",
                        tx.type === "INCOME" ? "text-green-600" : "text-red-500")}>
                        {tx.type === "INCOME" ? "+" : "−"}{formatMoney(tx.amount)} ₸
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно проведения ручной операции кассы (Приход / Уход) */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {txType === "INCOME" ? (
                <>
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span>Внесение прихода в кассу</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5 text-rose-600" />
                  <span>Выдача / Расход из кассы</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTx} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Категория операции</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {txType === "INCOME" ? (
                    <>
                      <SelectItem value="OTHER_INCOME">Прочий приход в кассу</SelectItem>
                      <SelectItem value="DEPOSIT_TOPUP">Пополнение владельцем</SelectItem>
                      <SelectItem value="SUBSCRIPTION_SALE">Продажа услуги</SelectItem>
                      <SelectItem value="CERTIFICATE_SALE">Продажа сертификата</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="TRAINER_SALARY">Выплата зарплаты фотографу / сотруднику</SelectItem>
                      <SelectItem value="OTHER_EXPENSE">Выдача владельцу / прочий расход</SelectItem>
                      <SelectItem value="HOUSEHOLD">Хозрасходы студии</SelectItem>
                      <SelectItem value="CLIENT_REFUND">Возврат денег клиенту</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Способ оплаты</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1">
                {[
                  { id: "KASPI", label: "Kaspi" },
                  { id: "HALYK", label: "Halyk" },
                  { id: "CASH",  label: "Наличные" },
                  { id: "MIXED", label: "Смешанная" },
                ].map((pm) => (
                  <Button
                    key={pm.id}
                    type="button"
                    variant={txPaymentMethod === pm.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxPaymentMethod(pm.id)}
                    className="text-xs px-2 h-8"
                  >
                    {pm.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Сумма (₸) *</Label>
              <Input
                type="number"
                min="0.01"
                step="any"
                placeholder="5000"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                required
                className="mt-1 font-bold text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Комментарий / Кому выдано (необязательно)</Label>
              <Textarea
                placeholder={txType === "INCOME" ? "Например: Пополнение кассы владельцем..." : "Например: Выдано фотографу Сергею..."}
                value={txDescription}
                onChange={e => setTxDescription(e.target.value)}
                className="mt-1 text-xs h-20 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setTxDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={txType === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              >
                {submitting ? "Сохранение..." : (txType === "INCOME" ? "Внести приход" : "Выдать расход")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
