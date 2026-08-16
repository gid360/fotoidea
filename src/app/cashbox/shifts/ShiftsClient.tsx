"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Wallet, Plus, Lock, ChevronRight, TrendingUp, TrendingDown,
  AlertCircle, Check, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatMoney, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { ShiftDetail } from "./ShiftDetail";
import { PageTabs } from "@/components/PageTabs";

const CASH_TABS = [
  { label: "Операции", href: "/cashbox/transactions" },
  { label: "Смены", href: "/cashbox/shifts" },
];

interface Shift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: string | number;
  closingBalance: string | number | null;
  systemBalance:  string | number | null;
  difference:     string | number | null;
  note: string | null;
  income:  number;
  expense: number;
  txCount: number;
  openedBy: { firstName: string; lastName: string };
}

export function ShiftsClient() {
  const qc = useQueryClient();
  const [openDialog, setOpenDialog]   = useState(false);
  const [closeDialog, setCloseDialog] = useState<Shift | null>(null);
  const [detail, setDetail]           = useState<Shift | null>(null);
  const [openBalance, setOpenBalance] = useState("0");
  const [closeBalance, setCloseBalance] = useState("");
  const [closeNote, setCloseNote]     = useState("");
  const [saving, setSaving]           = useState(false);

  const { data: shifts = [], refetch } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: () => fetch("/api/cashbox/shifts").then(r => r.json()),
  });

  const activeShift = shifts.find(s => !s.closedAt);

  async function openShift() {
    setSaving(true);
    const res = await fetch("/api/cashbox/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance: Number(openBalance) }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      toast({ title: e.error ?? "Ошибка", variant: "destructive" });
      return;
    }
    toast({ title: "Смена открыта" });
    setOpenDialog(false);
    refetch();
  }

  async function closeShift() {
    if (!closeDialog) return;
    setSaving(true);
    const res = await fetch(`/api/cashbox/shifts/${closeDialog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingBalance: Number(closeBalance), note: closeNote || undefined }),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Смена закрыта" });
    setCloseDialog(null);
    refetch();
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  if (detail) {
    return <ShiftDetail shift={detail} onBack={() => { setDetail(null); refetch(); }} />;
  }

  return (
    <div className="flex flex-col h-full">
      <PageTabs tabs={CASH_TABS} />
      <div className="p-4 border-b bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Кассовые смены</h1>
            <p className="text-sm text-muted-foreground">{shifts.length} смен</p>
          </div>
          {!activeShift ? (
            <Button onClick={() => { setOpenBalance("0"); setOpenDialog(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Открыть смену
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Смена открыта
              </div>
              <Button variant="outline" onClick={() => {
                setCloseBalance(String(Number(activeShift.openingBalance) + activeShift.income - activeShift.expense));
                setCloseNote("");
                setCloseDialog(activeShift);
              }}>
                <Lock className="h-4 w-4 mr-1.5" /> Закрыть смену
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Активная смена — карточка сверху */}
      {activeShift && (
        <div className="p-4 border-b bg-green-50/50">
          <div
            className="border border-green-200 rounded-xl p-4 bg-white cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => setDetail(activeShift)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">Текущая смена</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Открыта {format(new Date(activeShift.openedAt), "d MMMM, HH:mm", { locale: ru })} ·{" "}
                  {activeShift.openedBy.firstName} {activeShift.openedBy.lastName}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-green-100">
              <div>
                <p className="text-xs text-muted-foreground">Остаток на открытии</p>
                <p className="text-base font-semibold">{formatMoney(activeShift.openingBalance)} ₸</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" /> Приход</p>
                <p className="text-base font-semibold text-green-600">+{formatMoney(activeShift.income)} ₸</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-400" /> Расход</p>
                <p className="text-base font-semibold text-red-500">−{formatMoney(activeShift.expense)} ₸</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* История смен */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {shifts.filter(s => s.closedAt).map(shift => {
            const diff = Number(shift.difference ?? 0);
            return (
              <div
                key={shift.id}
                className="border rounded-xl p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setDetail(shift)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(shift.openedAt), "d MMMM yyyy", { locale: ru })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(shift.openedAt), "HH:mm")} — {shift.closedAt ? format(new Date(shift.closedAt), "HH:mm") : "—"} ·{" "}
                      {shift.openedBy.firstName} {shift.openedBy.lastName} · {shift.txCount} операций
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    {diff !== 0 && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                        diff > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      )}>
                        <AlertCircle className="h-3 w-3" />
                        {diff > 0 ? "+" : ""}{formatMoney(diff)} ₸
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Открытие</p>
                    <p className="font-medium">{formatMoney(shift.openingBalance)} ₸</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Приход</p>
                    <p className="font-medium text-green-600">+{formatMoney(shift.income)} ₸</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Расход</p>
                    <p className="font-medium text-red-500">−{formatMoney(shift.expense)} ₸</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Закрытие</p>
                    <p className="font-medium">{formatMoney(shift.closingBalance ?? 0)} ₸</p>
                  </div>
                </div>
              </div>
            );
          })}
          {shifts.filter(s => s.closedAt).length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-3 opacity-30" />
              <p>История смен пуста</p>
            </div>
          )}
        </div>
      </div>

      {/* Диалог открытия смены */}
      <Dialog open={openDialog} onOpenChange={v => !v && setOpenDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Открыть кассовую смену</DialogTitle></DialogHeader>
          <div>
            <Label>Фактический остаток в кассе (₸)</Label>
            <Input className="mt-1" type="number" min="0" step="any"
              value={openBalance} onChange={e => setOpenBalance(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Пересчитайте наличные и введите сумму</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Отмена</Button>
            <Button onClick={openShift} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Открыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог закрытия смены */}
      <Dialog open={!!closeDialog} onOpenChange={v => !v && setCloseDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Закрыть кассовую смену</DialogTitle></DialogHeader>
          {closeDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Остаток на открытии</span>
                  <span>{formatMoney(closeDialog.openingBalance)} ₸</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Приход</span>
                  <span>+{formatMoney(closeDialog.income)} ₸</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Расход</span>
                  <span>−{formatMoney(closeDialog.expense)} ₸</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Расчётный остаток</span>
                  <span>{formatMoney(Number(closeDialog.openingBalance) + closeDialog.income - closeDialog.expense)} ₸</span>
                </div>
              </div>
              <div>
                <Label>Фактический остаток (₸)</Label>
                <Input className="mt-1" type="number" min="0"
                  value={closeBalance} onChange={e => setCloseBalance(e.target.value)} />
              </div>
              <div>
                <Label>Примечание</Label>
                <Input className="mt-1" placeholder="Необязательно"
                  value={closeNote} onChange={e => setCloseNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Отмена</Button>
            <Button onClick={closeShift} disabled={saving || !closeBalance}>
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Закрыть смену
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
