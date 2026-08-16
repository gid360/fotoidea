"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, Camera, Upload, ImageIcon, GripVertical, Search, Users, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatMoney, formatDuration, PriceTier } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Hall { id: string; name: string; colorHex?: string }
interface Direction { id: string; name: string; colorHex?: string }

interface Plan {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  durationMin: number;
  peopleCount?: number;
  halls: Hall[];
  price: string | number;
  isPriceRange?: boolean;
  priceTo?: string | number | null;
  priceTiers?: PriceTier[] | null;
  isPerPerson: boolean;
  isActive: boolean;
  sortOrder?: number;
}

const EMPTY = {
  name: "",
  description: "",
  imageUrl: "",
  category: "Индивидуальная съёмка",
  durationMin: 60,
  peopleCount: 1,
  hallIds: [] as string[],
  price: 0,
  isPriceRange: false,
  priceTo: 0,
  priceTiers: [] as PriceTier[],
  isPerPerson: false,
  isActive: true,
};

export function PlansClient() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categorySearch, setCategorySearch] = useState("");

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => fetch("/api/subscriptions/plans").then(r => r.json()),
  });

  const { data: halls = [] } = useQuery<Hall[]>({
    queryKey: ["halls"],
    queryFn: () => fetch("/api/halls").then(r => r.json()),
  });

  const { data: directions = [] } = useQuery<Direction[]>({
    queryKey: ["directions"],
    queryFn: () => fetch("/api/directions").then(r => r.json()),
  });

  const DEFAULT_CATEGORIES = [
    { id: "default-1", name: "Фотосессия", colorHex: "#8B5CF6" },
    { id: "default-2", name: "Аренда", colorHex: "#3B82F6" },
    { id: "default-3", name: "Дополнения", colorHex: "#10B981" },
  ];

  const allCategoryOptions = DEFAULT_CATEGORIES;

  const availableCategories = ["Фотосессия", "Аренда", "Дополнения"];

  const visible = plans.filter(p => {
    if (!showArchived && !p.isActive) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }
    if (selectedCategory !== "all" && p.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...plans];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    qc.setQueryData(["plans"], list);

    try {
      const res = await fetch("/api/subscriptions/plans/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: list.map(p => p.id) }),
      });

      if (res.ok) {
        toast({ title: "Порядок услуг сохранён" });
      } else {
        toast({ title: "Ошибка сохранения порядка", variant: "destructive" });
        qc.invalidateQueries({ queryKey: ["plans"] });
      }
    } catch {
      toast({ title: "Ошибка отправки данных", variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["plans"] });
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      imageUrl: plan.imageUrl ?? "",
      category: plan.category ?? "Индивидуальная съёмка",
      durationMin: plan.durationMin,
      peopleCount: plan.peopleCount ?? 1,
      hallIds: (plan.halls ?? []).map(h => h.id),
      price: Number(plan.price),
      isPriceRange: Boolean(plan.isPriceRange),
      priceTo: plan.priceTo ? Number(plan.priceTo) : 0,
      priceTiers: (plan.priceTiers as PriceTier[]) || [],
      isPerPerson: plan.isPerPerson,
      isActive: plan.isActive,
    });
    setDialogOpen(true);
  }

  function addPriceTier() {
    const lastTier = form.priceTiers[form.priceTiers.length - 1];
    const minPeople = lastTier && lastTier.maxPeople ? lastTier.maxPeople + 1 : 1;
    setForm(f => ({
      ...f,
      priceTiers: [
        ...f.priceTiers,
        { minPeople, maxPeople: minPeople + 10, pricePerPerson: Number(f.price) || 2000 },
      ],
    }));
  }

  function removePriceTier(index: number) {
    setForm(f => ({
      ...f,
      priceTiers: f.priceTiers.filter((_, i) => i !== index),
    }));
  }

  function updatePriceTier(index: number, field: keyof PriceTier, val: any) {
    setForm(f => {
      const next = [...f.priceTiers];
      next[index] = { ...next[index], [field]: val };
      return { ...f, priceTiers: next };
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/service-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(f => ({ ...f, imageUrl: data.url }));
        toast({ title: "Фото загружено" });
      } else {
        toast({ title: "Ошибка загрузки", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка загрузки файла", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/subscriptions/plans/${editing.id}` : "/api/subscriptions/plans";
    const method = editing ? "PATCH" : "POST";
    const payload = {
      ...form,
      price: Number(form.price),
      isPriceRange: form.isPriceRange,
      priceTo: form.isPriceRange && Number(form.priceTo) > 0 ? Number(form.priceTo) : null,
      priceTiers: form.priceTiers.length > 0 ? form.priceTiers : null,
      durationMin: Number(form.durationMin),
      peopleCount: Number(form.peopleCount) || 1,
      hallIds: form.hallIds,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      category: form.category || null,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { toast({ title: "Ошибка", variant: "destructive" }); return; }
    toast({ title: editing ? "Услуга обновлена" : "Услуга создана" });
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  async function deletePlan(plan: Plan) {
    if (!confirm(`Удалить услугу "${plan.name}"?`)) return;
    const res = await fetch(`/api/subscriptions/plans/${plan.id}`, { method: "DELETE" });
    const data = await res.json();
    toast({ title: data.archived ? "Услуга архивирована" : "Услуга удалена" });
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b bg-background shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Услуги</h1>
            <p className="text-xs text-muted-foreground">
              {plans.filter(p => p.isActive).length} активных
              <span className="hidden sm:inline"> · Порядок перетягивается мышкой</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} className="scale-75 origin-right" />
              Архивные
            </label>
            <Button size="sm" onClick={openCreate} className="h-8 px-2.5 text-xs sm:text-sm font-medium">
              <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
            </Button>
          </div>
        </div>

        {/* Фильтр по категориям и поиск */}
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Поиск услуги..."
              className="pl-8 h-8 text-xs sm:text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-52 shrink-0">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full h-8 text-xs sm:text-sm">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Camera className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Услуг пока нет</p>
            <Button size="sm" className="mt-3" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1" /> Создать первую</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Мобильная версия: Компактные плитки */}
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {visible.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "p-2.5 rounded-lg border bg-card shadow-2xs flex flex-col gap-2 transition-all hover:border-slate-300 dark:hover:border-slate-700",
                    !plan.isActive && "opacity-60 bg-muted/20"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {plan.imageUrl ? (
                      <img
                        src={plan.imageUrl}
                        alt=""
                        className="h-11 w-11 object-cover rounded-md border shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-md border bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                        <ImageIcon className="h-5 w-5 opacity-40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {plan.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(plan)}
                            title="Редактировать"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePlan(plan)}
                            title="Удалить"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <div className="font-bold text-xs text-primary">
                          {plan.isPriceRange && plan.priceTo ? (
                            <span>{formatMoney(plan.price)} – {formatMoney(plan.priceTo)} ₸</span>
                          ) : (
                            <span>{formatMoney(plan.price)} ₸</span>
                          )}
                          {plan.isPerPerson && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/ чел.</span>}
                        </div>

                        <div className="flex items-center gap-1">
                          {plan.category && (
                            <Badge variant="secondary" className="text-[9px] font-normal px-1.5 py-0 h-4">
                              {plan.category}
                            </Badge>
                          )}
                          {plan.isActive ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0 rounded-full bg-emerald-100 text-emerald-800">
                              Активна
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0 rounded-full bg-slate-100 text-slate-600">
                              Архив
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Нижняя строчка с доп. информацией */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plan.durationMin > 0 && (
                        <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDuration(plan.durationMin)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                        <Users className="h-2.5 w-2.5" />
                        {plan.peopleCount ?? 1} чел.
                      </span>
                    </div>

                    {plan.halls && plan.halls.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {plan.halls.map(h => (
                          <span
                            key={h.id}
                            className="inline-flex items-center gap-1 text-[9px] bg-slate-50 dark:bg-slate-900 border px-1 py-0.2 rounded font-medium text-slate-600 dark:text-slate-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: h.colorHex || "#3B82F6" }} />
                            {h.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Десктопная версия: Таблица с Drag-and-Drop */}
            <div className="hidden md:block border rounded-xl overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center"></th>
                    <th className="px-4 py-3 w-16">Фото</th>
                    <th className="px-4 py-3">Название и описание</th>
                    <th className="px-4 py-3">Категория</th>
                    <th className="px-4 py-3">Доступные залы</th>
                    <th className="px-4 py-3">Длительность</th>
                    <th className="px-4 py-3">Кол-во чел.</th>
                    <th className="px-4 py-3">Цена</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((plan, index) => (
                    <tr
                      key={plan.id}
                      draggable={true}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={cn(
                        "hover:bg-muted/40 transition-colors select-none",
                        !plan.isActive && "opacity-60 bg-muted/20",
                        draggedIndex === index && "opacity-30 bg-muted/50 border-dashed border-2 border-primary"
                      )}
                    >
                      <td className="px-3 py-3 text-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4 mx-auto" />
                      </td>
                      <td className="px-4 py-3">
                        {plan.imageUrl ? (
                          <img src={plan.imageUrl} alt="" className="h-10 w-10 object-cover rounded-lg border" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-5 w-5 opacity-40" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{plan.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {plan.category ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {plan.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {plan.halls && plan.halls.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {plan.halls.map(h => (
                              <Badge key={h.id} variant="secondary" className="text-[11px] font-normal">
                                <span className="w-2 h-2 rounded-full mr-1 shrink-0" style={{ background: h.colorHex || "#3B82F6" }} />
                                {h.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {plan.durationMin > 0 ? (
                          formatDuration(plan.durationMin)
                        ) : (
                          <span className="text-muted-foreground font-normal">Не показывать</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {plan.peopleCount ?? 1} чел.
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                        {plan.isPriceRange && plan.priceTo ? (
                          <span>{formatMoney(plan.price)} – {formatMoney(plan.priceTo)} ₸</span>
                        ) : (
                          <span>{formatMoney(plan.price)} ₸</span>
                        )}
                        {plan.isPerPerson && <span className="text-xs font-normal text-muted-foreground ml-1">/ чел.</span>}
                        {plan.priceTiers && plan.priceTiers.length > 0 && (
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            ({plan.priceTiers.length} тарифа по чел.)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {plan.isActive ? (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Активна</span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Архив</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(plan)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50" onClick={() => deletePlan(plan)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать услугу" : "Новая услуга"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Фотография */}
            <div>
              <Label>Фотография услуги</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Превью" className="h-16 w-16 object-cover rounded-lg border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6 opacity-30" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <span>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {uploading ? "Загрузка..." : form.imageUrl ? "Изменить фото" : "Загрузить фото"}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG, WebP до 5 МБ</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Название услуги</Label>
              <Input className="mt-1" placeholder="например: Школьная фотосессия, Индивидуальная съёмка"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Категория услуги (Раскрывающийся список с поиском) */}
            <div>
              <Label>Категория услуги</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите категорию услуги..." />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                    <Input
                      placeholder="Поиск категории..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      className="h-8 text-xs"
                    />
                  </div>
                  {allCategoryOptions
                    .filter(d => d.name.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map(d => (
                      <SelectItem key={d.id} value={d.name}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: d.colorHex || "#8B5CF6" }}
                          />
                          <span>{d.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {allCategoryOptions.filter(d => d.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Категория не найдена
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Привязка к нескольким залам */}
            <div>
              <Label>Привязка к залам</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {halls.map(h => {
                  const isSelected = form.hallIds.includes(h.id);
                  return (
                    <Button
                      key={h.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newIds = isSelected
                          ? form.hallIds.filter(id => id !== h.id)
                          : [...form.hallIds, h.id];
                        setForm(f => ({ ...f, hallIds: newIds }));
                      }}
                      className={cn("transition-all text-xs", isSelected && "font-semibold shadow-sm")}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" style={{ background: (h as any).colorHex || "#3B82F6" }} />
                      {h.name} {isSelected && "✓"}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Длительность и Базовое количество человек */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Длительность</Label>
                <Select value={String(form.durationMin ?? 60)} onValueChange={v => setForm(f => ({ ...f, durationMin: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 0, label: "Не показывать" },
                      { value: 15, label: "15 мин" },
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

              <div>
                <Label>Кол-во человек (базовое)</Label>
                <Input
                  className="mt-1 font-semibold"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={form.peopleCount}
                  onChange={e => setForm(f => ({ ...f, peopleCount: Number(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Настройка Цены и Диапазона цен */}
            <div className="p-3.5 border rounded-xl bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Стоимость услуги</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Switch
                    checked={form.isPriceRange}
                    onCheckedChange={v => setForm(f => ({ ...f, isPriceRange: v }))}
                  />
                  Указать диапазон цен (от ... до ...)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{form.isPriceRange ? "Цена от (₸)" : "Цена (₸)"}</Label>
                  <Input
                    className="mt-1 font-semibold"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="15000"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>

                {form.isPriceRange && (
                  <div>
                    <Label className="text-xs">Цена до (₸)</Label>
                    <Input
                      className="mt-1 font-semibold"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="30000"
                      value={form.priceTo}
                      onChange={e => setForm(f => ({ ...f, priceTo: Number(e.target.value) }))}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch checked={form.isPerPerson} onCheckedChange={v => setForm(f => ({ ...f, isPerPerson: v }))} />
                <span className="text-xs font-medium text-foreground">Расчет цены за каждого человека</span>
              </div>
            </div>

            {/* Тарифы цен за каждого человека по количеству участников (например, школьные съемки) */}
            <div className="p-3.5 border rounded-xl bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-sm flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Тарифы по количеству человек
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Например для школьных фотосессий: разная цена за чел. при разном размере группы
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addPriceTier}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Добавить тариф
                </Button>
              </div>

              {form.priceTiers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-2">
                  Индивидуальные тарифы не заданы (используется базовая цена)
                </p>
              ) : (
                <div className="space-y-2">
                  {form.priceTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-background border rounded-lg text-xs">
                      <span className="text-muted-foreground font-medium shrink-0">От</span>
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-7 text-xs font-bold text-center p-1"
                        value={tier.minPeople}
                        onChange={e => updatePriceTier(idx, "minPeople", Number(e.target.value) || 1)}
                      />
                      <span className="text-muted-foreground font-medium shrink-0">до</span>
                      <Input
                        type="number"
                        min="1"
                        placeholder="∞"
                        className="w-16 h-7 text-xs font-bold text-center p-1"
                        value={tier.maxPeople ?? ""}
                        onChange={e => updatePriceTier(idx, "maxPeople", e.target.value ? Number(e.target.value) : null)}
                      />
                      <span className="text-muted-foreground font-medium shrink-0">чел.:</span>
                      <Input
                        type="number"
                        step="any"
                        className="flex-1 h-7 text-xs font-bold p-1"
                        placeholder="Цена за чел."
                        value={tier.pricePerPerson}
                        onChange={e => updatePriceTier(idx, "pricePerPerson", Number(e.target.value) || 0)}
                      />
                      <span className="text-muted-foreground font-medium shrink-0">₸/чел.</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:bg-red-50"
                        onClick={() => removePriceTier(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Описание для онлайн-записи */}
            <div>
              <Label>Описание для онлайн-записи</Label>
              <Textarea
                className="mt-1 min-h-[100px] resize-y text-sm"
                placeholder="Подробное описание того, что входит в услугу..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving || !form.name}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
