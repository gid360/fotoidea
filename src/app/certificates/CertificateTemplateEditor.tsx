"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Palette, Sparkles, MoveVertical, RefreshCw, Save, Check, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "@/lib/use-toast";
import { DEFAULT_TEMPLATE } from "../api/certificates/template/route";

interface TemplateConfig {
  bgType: string;
  bgColor: string;
  bgGradientFrom: string;
  bgGradientTo: string;
  bgImageUrl: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  fontFamily: string;
  titleText: string;
  subtitleText: string;
  rulesText: string;
  showBorder: boolean;
  borderColor: string;
  titlePosY: number;
  codePosY: number;
  detailsPosY: number;
  rulesPosY: number;
}

const PRESET_THEMES = [
  {
    name: "Dark Gold (Тёмное золото)",
    bgColor: "#0F172A",
    bgGradientFrom: "#0F172A",
    bgGradientTo: "#1E293B",
    accentColor: "#D97706",
    textColor: "#FFFFFF",
    subtextColor: "#94A3B8",
    borderColor: "#D97706",
  },
  {
    name: "Midnight Navy (Королевский синий)",
    bgColor: "#091E42",
    bgGradientFrom: "#091E42",
    bgGradientTo: "#172B4D",
    accentColor: "#38BDF8",
    textColor: "#FFFFFF",
    subtextColor: "#CBD5E1",
    borderColor: "#38BDF8",
  },
  {
    name: "Emerald Luxury (Изумруд)",
    bgColor: "#064E3B",
    bgGradientFrom: "#064E3B",
    bgGradientTo: "#022C22",
    accentColor: "#34D399",
    textColor: "#FFFFFF",
    subtextColor: "#A7F3D0",
    borderColor: "#34D399",
  },
  {
    name: "Rose Gold (Розовое золото)",
    bgColor: "#4C0519",
    bgGradientFrom: "#4C0519",
    bgGradientTo: "#881337",
    accentColor: "#FB7185",
    textColor: "#FFFFFF",
    subtextColor: "#FECDD3",
    borderColor: "#FB7185",
  },
  {
    name: "Clean Light (Светлый стиль)",
    bgColor: "#F8FAFC",
    bgGradientFrom: "#F8FAFC",
    bgGradientTo: "#F1F5F9",
    accentColor: "#2563EB",
    textColor: "#0F172A",
    subtextColor: "#64748B",
    borderColor: "#2563EB",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificateTemplateEditor({ open, onOpenChange }: Props) {
  const [config, setConfig] = useState<TemplateConfig>({ ...DEFAULT_TEMPLATE });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/certificates/template")
        .then(r => r.json())
        .then(data => {
          setConfig({ ...DEFAULT_TEMPLATE, ...data });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/certificates/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "Шаблон сертификата сохранён!" });
        onOpenChange(false);
      } else {
        toast({ title: "Ошибка сохранения", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function applyTheme(theme: typeof PRESET_THEMES[0]) {
    setConfig(c => ({
      ...c,
      bgColor: theme.bgColor,
      bgGradientFrom: theme.bgGradientFrom,
      bgGradientTo: theme.bgGradientTo,
      accentColor: theme.accentColor,
      textColor: theme.textColor,
      subtextColor: theme.subtextColor,
      borderColor: theme.borderColor,
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-500" />
            Редактор шаблона сертификата (10 × 15 см)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Левая колонка: Интерактивное превью карточки 10х15 см */}
          <div className="md:col-span-6 flex flex-col items-center justify-start space-y-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Интерактивное превью (10 × 15 см)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-mono">
                Печать: 150×100 мм
              </span>
            </div>

            {/* Карточка 10х15 см Вертикальная (соотношение сторон 10:15 / 2:3) */}
            <div
              className="w-full max-w-[280px] aspect-[10/15] rounded-[15px] shadow-xl relative overflow-hidden flex flex-col justify-between p-4 border transition-all duration-300 mx-auto text-center"
              style={{
                backgroundColor: config.bgColor || "#FAF8F5",
                backgroundImage: config.bgImageUrl ? `url(${config.bgImageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: config.textColor || "#3D352E",
                borderColor: config.showBorder ? (config.borderColor || "#D6C4A5") : "transparent",
                borderWidth: config.showBorder ? "10px" : "0px",
              }}
            >
              {/* Kazakh National Ornament (Ою-өрнек) Corners */}
              {config.showBorder && (
                <>
                  <span className="absolute top-1 left-1 text-[10px] pointer-events-none select-none" style={{ color: config.borderColor }}>❖</span>
                  <span className="absolute top-1 right-1 text-[10px] pointer-events-none select-none" style={{ color: config.borderColor }}>❖</span>
                  <span className="absolute bottom-1 left-1 text-[10px] pointer-events-none select-none" style={{ color: config.borderColor }}>❖</span>
                  <span className="absolute bottom-1 right-1 text-[10px] pointer-events-none select-none" style={{ color: config.borderColor }}>❖</span>
                </>
              )}

              {/* Верхняя часть: Логотип и Заголовок */}
              <div className="space-y-0.5 border-b pb-2 flex flex-col items-center" style={{ borderColor: config.borderColor + "40" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/fotoidea-logo.png" alt="Fotoidea Logo" className="w-8 h-8 object-contain mb-[25px]" />
                <span className="font-serif italic font-bold text-base leading-none block" style={{ color: config.textColor }}>
                  Fotoidea.kz
                </span>
                <h3 className="text-xs font-extrabold tracking-widest uppercase mt-0.5" style={{ color: config.textColor }}>
                  {config.titleText || "С Е Р Т И Ф И К А Т"}
                </h3>
                <p className="text-[7px] font-medium tracking-wider uppercase" style={{ color: config.subtextColor }}>
                  {config.subtitleText || "НА ПРОФЕССИОНАЛЬНУЮ ФОТОСЕССИЮ"}
                </p>
              </div>

              {/* Средняя часть: Номер и Услуги */}
              <div className="space-y-3 my-auto py-1">
                <div className="text-[8.5px] italic font-serif opacity-80 mb-1" style={{ color: config.textColor }}>
                  Любимой маме от Екатерины
                </div>
                <div className="font-mono text-sm font-bold text-center">
                  № 274
                </div>
                <div className="text-[8px] font-medium text-center" style={{ color: config.subtextColor }}>
                  Действителен до 05.11.2026
                </div>

                <div className="text-[9px] leading-tight space-y-1 mt-5">
                  <p className="font-bold text-[10px]" style={{ color: config.textColor }}>
                    Фотосессия в фотостудии FOTOIDEA
                  </p>
                  <div className="text-[8px] space-y-0.5" style={{ color: config.subtextColor }}>
                    {(config.rulesText || "").split("\n").map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* QR-код в центре */}
              <div className="flex flex-col items-center justify-center my-1">
                <div className="w-12 h-12 bg-black/90 p-1 rounded-lg flex items-center justify-center text-[8px] text-white font-mono shadow-xs">
                  [QR]
                </div>
                <span className="text-[6.5px] mt-0.5" style={{ color: config.subtextColor }}>
                  Электронный сертификат
                </span>
              </div>

              {/* Нижняя часть: Контакты и Адрес */}
              <div className="pt-2 border-t space-y-1 text-[7.5px] leading-tight" style={{ borderColor: config.borderColor + "40" }}>
                <p className="font-bold text-[8.5px]" style={{ color: config.textColor }}>
                  +7 777 79 79 888  ·  fotoideakz
                </p>
                <p style={{ color: config.subtextColor }}>
                  г. Уральск, пр. Абулхаир хана 147, ЖК Азимут
                </p>
              </div>
            </div>

            {/* Пресеты тем */}
            <div className="w-full space-y-2 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Готовые темы оформления
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_THEMES.map(theme => (
                  <button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className="flex items-center gap-2 p-2 rounded-md border hover:border-amber-500 text-left transition-all text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 border"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <span className="truncate text-xs font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка: Настройки стиля, цветов и текстов */}
          <div className="md:col-span-6 space-y-5">
            {/* Тексты */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Тексты сертификата
              </h4>

              <div>
                <Label className="text-xs">Подзаголовок студии</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={config.subtitleText}
                  onChange={e => setConfig(c => ({ ...c, subtitleText: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs">Главный заголовок</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={config.titleText}
                  onChange={e => setConfig(c => ({ ...c, titleText: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs">Правила и условия</Label>
                <Textarea
                  className="text-xs mt-1 h-20 resize-none"
                  value={config.rulesText}
                  onChange={e => setConfig(c => ({ ...c, rulesText: e.target.value }))}
                />
              </div>
            </div>

            {/* Цвета */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Цветовая палитра
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Фон (начало)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.bgGradientFrom || config.bgColor}
                      onChange={e => setConfig(c => ({ ...c, bgGradientFrom: e.target.value, bgColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                    <Input
                      className="h-7 text-xs font-mono"
                      value={config.bgGradientFrom || config.bgColor}
                      onChange={e => setConfig(c => ({ ...c, bgGradientFrom: e.target.value, bgColor: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Фон (конец)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.bgGradientTo || config.bgColor}
                      onChange={e => setConfig(c => ({ ...c, bgGradientTo: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                    <Input
                      className="h-7 text-xs font-mono"
                      value={config.bgGradientTo || config.bgColor}
                      onChange={e => setConfig(c => ({ ...c, bgGradientTo: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Акцент / Рамка</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={e => setConfig(c => ({ ...c, accentColor: e.target.value, borderColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                    <Input
                      className="h-7 text-xs font-mono"
                      value={config.accentColor}
                      onChange={e => setConfig(c => ({ ...c, accentColor: e.target.value, borderColor: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Цвет текста</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.textColor}
                      onChange={e => setConfig(c => ({ ...c, textColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                    <Input
                      className="h-7 text-xs font-mono"
                      value={config.textColor}
                      onChange={e => setConfig(c => ({ ...c, textColor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs">Показывать декоративную рамку</Label>
                <Switch
                  checked={config.showBorder}
                  onCheckedChange={v => setConfig(c => ({ ...c, showBorder: v }))}
                />
              </div>
            </div>

            {/* Фоновое изображение */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-amber-500" /> Фоновый рисунок (PNG / JPG)
              </h4>

              <div className="space-y-2">
                <Label className="text-xs">Загрузить готовый фон из файла</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="text-xs h-9 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      try {
                        const res = await fetch("/api/upload/service-photo", {
                          method: "POST",
                          body: fd,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setConfig(c => ({ ...c, bgImageUrl: data.url }));
                          toast({ title: "Фоновый рисунок загружен!" });
                        }
                      } catch (err) {
                        toast({ title: "Ошибка загрузки файла", variant: "destructive" });
                      }
                    }}
                  />
                  {config.bgImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2 text-xs text-red-500 shrink-0"
                      onClick={() => setConfig(c => ({ ...c, bgImageUrl: "" }))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить
                    </Button>
                  )}
                </div>
                {config.bgImageUrl && (
                  <p className="text-[11px] text-emerald-600 font-mono truncate">
                    Фон: {config.bgImageUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Расположение полей */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MoveVertical className="h-3.5 w-3.5" /> Позиции элементов
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Высота заголовка</span>
                  <span className="font-mono text-muted-foreground">{config.titlePosY}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={1}
                  value={config.titlePosY}
                  onChange={e => setConfig(c => ({ ...c, titlePosY: Number(e.target.value) }))}
                  className="w-full accent-amber-500 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Высота кода</span>
                  <span className="font-mono text-muted-foreground">{config.codePosY}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={60}
                  step={1}
                  value={config.codePosY}
                  onChange={e => setConfig(c => ({ ...c, codePosY: Number(e.target.value) }))}
                  className="w-full accent-amber-500 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Высота деталей</span>
                  <span className="font-mono text-muted-foreground">{config.detailsPosY}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={80}
                  step={1}
                  value={config.detailsPosY}
                  onChange={e => setConfig(c => ({ ...c, detailsPosY: Number(e.target.value) }))}
                  className="w-full accent-amber-500 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t shrink-0 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfig({ ...DEFAULT_TEMPLATE })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Сбросить по умолчанию
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Сохранить шаблон
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
