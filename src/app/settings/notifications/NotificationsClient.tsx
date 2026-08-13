"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Check, Info, RefreshCw, Moon, BellOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  body: string;
  isActive: boolean;
}

const TEMPLATE_META: Record<string, { label: string; desc: string; vars: string[] }> = {
  booking_confirm:    {
    label: "Подтверждение записи",
    desc:  "Отправляется клиенту при создании записи на съёмку или аренду",
    vars:  ["{{client_name}}", "{{class_date}}", "{{class_time}}", "{{direction}}", "{{trainer_name}}", "{{hall_name}}"],
  },
  booking_changed:    {
    label: "Изменение записи",
    desc:  "Отправляется клиенту при переносе или изменении параметров съёмки",
    vars:  ["{{client_name}}", "{{class_date}}", "{{class_time}}", "{{direction}}", "{{hall_name}}"],
  },
  booking_cancelled:  {
    label: "Отмена записи",
    desc:  "Отправляется клиенту при отмене записи",
    vars:  ["{{client_name}}", "{{class_date}}", "{{class_time}}", "{{direction}}"],
  },
  reminder:           {
    label: "Напоминание о съёмке/аренде",
    desc:  "Отправляется за 8 часов до съёмки (не в тихие часы 22:00–09:00)",
    vars:  ["{{client_name}}", "{{class_time}}", "{{class_date}}", "{{direction}}", "{{hall_name}}"],
  },
  review_request:     {
    label: "Запрос отзыва после визита",
    desc:  "Отправляется клиенту после завершения фотосессии для получения обратной связи",
    vars:  ["{{client_name}}", "{{direction}}"],
  },
  print_discount:     {
    label: "Скидка на печать",
    desc:  "Отправляется через 12 дней после фотосессии со специальным предложением на печать",
    vars:  ["{{client_name}}"],
  },
  birthday:           {
    label: "День рождения",
    desc:  "Отправляется в день рождения клиента (не в тихие часы 22:00–09:00)",
    vars:  ["{{client_name}}"],
  },
};

export function NotificationsClient() {
  const qc = useQueryClient();
  const [editId, setEditId]     = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving]     = useState(false);
  const [togglingAll, setTogglingAll] = useState(false);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["notification-templates"],
    queryFn: () => fetch("/api/settings/notifications").then(r => r.json()),
  });

  const allDisabled = templates.every(t => !t.isActive);

  function startEdit(t: Template) { setEditId(t.id); setEditBody(t.body); }
  function cancelEdit()            { setEditId(null); setEditBody(""); }

  async function saveTemplate(t: Template) {
    setSaving(true);
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, body: editBody }),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: "Шаблон сохранён" });
    setEditId(null);
    qc.invalidateQueries({ queryKey: ["notification-templates"] });
  }

  async function toggleActive(t: Template) {
    await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, body: t.body, isActive: !t.isActive }),
    });
    qc.invalidateQueries({ queryKey: ["notification-templates"] });
  }

  async function toggleAll(enable: boolean) {
    setTogglingAll(true);
    try {
      await Promise.all(
        templates.map(t =>
          fetch("/api/settings/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: t.id, body: t.body, isActive: enable }),
          })
        )
      );
      toast({
        title: enable ? "Все уведомления включены" : "Все уведомления отключены",
      });
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
    } finally {
      setTogglingAll(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b">
        <div>
          <h1 className="text-xl font-bold">Автоматические уведомления WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Управление автоматическими рассылками и напоминаниями</p>
        </div>

        <div className="flex items-center gap-2">
          {allDisabled ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleAll(true)}
              disabled={togglingAll}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Включить все уведомления
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => toggleAll(false)}
              disabled={togglingAll}
            >
              <BellOff className="h-4 w-4 mr-1.5" />
              Отключить все уведомления
            </Button>
          )}
        </div>
      </div>

      {/* Warning banner when disabled */}
      {allDisabled && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
          <BellOff className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Все автоматические уведомления выключены</p>
            <p className="text-xs text-amber-700 mt-0.5">
              CRM не будет отправлять рассылки, напоминания о записи или поздравления клиентам.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {templates.map(t => {
          const meta = TEMPLATE_META[t.id];
          const isEditing = editId === t.id;
          return (
            <div key={t.id} className={cn("border rounded-xl p-4 space-y-3 transition-opacity", !t.isActive && "opacity-60 bg-slate-50/50")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className={cn("h-4 w-4 shrink-0", !t.isActive ? "text-slate-400" : t.id === "birthday" ? "text-pink-500" : "text-green-500")} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{meta?.label ?? t.name}</p>
                      {!t.isActive && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Отключено</span>
                      )}
                    </div>
                    {meta && <p className="text-xs text-muted-foreground">{meta.desc}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t)} />
                  {!isEditing && (
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Редактировать</Button>
                  )}
                </div>
              </div>

              {meta?.vars && (
                <div className="flex flex-wrap gap-1">
                  {meta.vars.map(v => (
                    <span key={v} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{v}</span>
                  ))}
                </div>
              )}

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveTemplate(t)} disabled={saving || !editBody}>
                      <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Отмена</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono whitespace-pre-wrap">
                  {t.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
