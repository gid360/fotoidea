"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, FileText, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/use-toast";

interface QuickReplyItem {
  id: string;
  title: string;
  text: string;
}

export default function QuickRepliesSettingsPage() {
  const [replies, setReplies] = useState<QuickReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuickReplyItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    fetchReplies();
  }, []);

  async function fetchReplies() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/quick-replies").then(r => r.json());
      setReplies(res.replies || []);
    } catch (e) {
      console.error("Error loading quick replies:", e);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setTitleInput("");
    setTextInput("");
    setModalOpen(true);
  }

  function openEditModal(item: QuickReplyItem) {
    setEditingItem(item);
    setTitleInput(item.title);
    setTextInput(item.text);
    setModalOpen(true);
  }

  async function handleSaveItem() {
    if (!titleInput.trim() || !textInput.trim()) {
      toast({ title: "Ошибка", description: "Заполните заголовок и текст шаблона", variant: "destructive" });
      return;
    }

    let nextReplies: QuickReplyItem[] = [];
    if (editingItem) {
      nextReplies = replies.map(r => r.id === editingItem.id ? { ...r, title: titleInput.trim(), text: textInput.trim() } : r);
    } else {
      const newItem: QuickReplyItem = {
        id: Date.now().toString(),
        title: titleInput.trim(),
        text: textInput.trim(),
      };
      nextReplies = [...replies, newItem];
    }

    setReplies(nextReplies);
    setModalOpen(false);
    await saveToServer(nextReplies);
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Удалить этот быстрый ответ?")) return;
    const nextReplies = replies.filter(r => r.id !== id);
    setReplies(nextReplies);
    await saveToServer(nextReplies);
  }

  async function saveToServer(items: QuickReplyItem[]) {
    setSaving(true);
    try {
      await fetch("/api/settings/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replies: items }),
      });
      toast({ title: "Сохранено", description: "Шаблоны быстрых ответов обновлены" });
    } catch (e) {
      console.error(e);
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Быстрые ответы и шаблоны сообщений
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Настройте шаблоны частых ответов клиентам для быстрого выбора во время переписки
          </p>
        </div>

        <Button onClick={openCreateModal} size="sm" className="gap-1.5 text-xs font-semibold">
          <Plus className="h-4 w-4" /> Добавить шаблон
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Загрузка шаблонов…
        </div>
      ) : replies.length === 0 ? (
        <div className="p-12 border-2 border-dashed rounded-xl text-center text-xs text-muted-foreground space-y-3">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">Шаблоны быстрых ответов пока не созданы</p>
          <Button onClick={openCreateModal} size="sm" variant="outline" className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Создать первый шаблон
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {replies.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl border bg-card text-card-foreground shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 group relative"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{r.title}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(r)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                      title="Редактировать"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(r.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {r.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editingItem ? "Редактировать шаблон" : "Новый быстрый ответ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Название шаблона</Label>
              <Input
                placeholder="Например: Адрес и локация"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Текст сообщения</Label>
              <Textarea
                placeholder="Например: Наш адрес: г. Уральск, пр. Абулхаир хана 147…"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="text-xs mt-1 min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
              Отмена
            </Button>
            <Button size="sm" onClick={handleSaveItem} disabled={saving} className="text-xs">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
