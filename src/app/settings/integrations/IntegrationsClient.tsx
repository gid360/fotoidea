"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle, Instagram, Check, RefreshCw, QrCode, Shield, Server, Key, Link2, Copy, AlertCircle, CheckCircle2, Download, Building2, UserCheck, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AltegioImportDialog } from "@/components/AltegioImportDialog";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

export function IntegrationsClient() {
  const qc = useQueryClient();

  // 1. WhatsApp session state
  const { data: waSession, refetch: refetchWa } = useQuery({
    queryKey: ["whatsapp-session"],
    queryFn: () => fetch("/api/whatsapp/session").then((r) => r.json()),
  });

  const [serverUrl, setServerUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savingWa, setSavingWa] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [checkingQr, setCheckingQr] = useState(false);

  // 2. Settings state (Instagram + Altegio)
  const { data: settings = {}, refetch: refetchSettings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const [instaUsername, setInstaUsername] = useState("");
  const [instaAccountId, setInstaAccountId] = useState("");
  const [instaPageToken, setInstaPageToken] = useState("");
  const [instaAvatarUrl, setInstaAvatarUrl] = useState("");
  const [savingInsta, setSavingInsta] = useState(false);
  const [instaModalOpen, setInstaModalOpen] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Altegio settings state
  const [altegioCompanyId, setAltegioCompanyId] = useState("");
  const [altegioUserToken, setAltegioUserToken] = useState("");
  const [altegioPartnerToken, setAltegioPartnerToken] = useState("");
  const [altegioLogin, setAltegioLogin] = useState("");
  const [altegioPassword, setAltegioPassword] = useState("");
  const [savingAltegio, setSavingAltegio] = useState(false);
  const [altegioImportOpen, setAltegioImportOpen] = useState(false);

  useEffect(() => {
    if (waSession) {
      setServerUrl(waSession.serverUrl || "https://wa.gid360.kz");
      setInstanceName(waSession.instanceName || "Fotoidea");
      setApiKey(waSession.apiKey || "DFF771FF-89DD-4F8A-AC52-57ACC5E93D1C");
    }
  }, [waSession]);

  useEffect(() => {
    if (settings) {
      setInstaUsername(settings.instagramUsername || "maqta_qyz07");
      setInstaAccountId(settings.instagramAccountId || "17841441579820989");
      setInstaPageToken(settings.instagramPageToken || "");
      setInstaAvatarUrl(settings.instagramAvatarUrl || "");
      setAltegioCompanyId(settings.altegioCompanyId || "");
      setAltegioUserToken(settings.altegioUserToken || "");
      setAltegioPartnerToken(settings.altegioPartnerToken || "");
      setAltegioLogin(settings.altegioLogin || "");
      setAltegioPassword(settings.altegioPassword || "");
    }
  }, [settings]);

  async function handleSaveWa() {
    setSavingWa(true);
    try {
      const res = await fetch("/api/whatsapp/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "EVOLUTION",
          serverUrl,
          instanceName,
          apiKey,
        }),
      });
      if (res.ok) {
        toast({ title: "Настройки WhatsApp сохранены" });
        refetchWa();
      } else {
        toast({ title: "Ошибка сохранения", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка соединения", variant: "destructive" });
    } finally {
      setSavingWa(false);
    }
  }

  async function handleCheckQr() {
    setCheckingQr(true);
    try {
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json();
      setQrCodeData(data.qrCode || null);
      setQrModalOpen(true);
      refetchWa();
    } catch (e) {
      toast({ title: "Ошибка получения QR-кода", variant: "destructive" });
    } finally {
      setCheckingQr(false);
    }
  }

  async function handleSaveInsta() {
    if (!instaUsername.trim() || !instaAccountId.trim()) {
      toast({ title: "Заполните имя пользователя и ID аккаунта", variant: "destructive" });
      return;
    }

    setSavingInsta(true);
    try {
      const cleanUsername = instaUsername.replace(/^@/, "").trim();
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramUsername: cleanUsername,
          instagramAccountId: instaAccountId.trim(),
          instagramPageToken: instaPageToken.trim(),
          instagramAvatarUrl: instaAvatarUrl.trim(),
          instagramConnected: "true",
        }),
      });
      if (res.ok) {
        toast({ title: "Instagram аккаунт успешно подключен!" });
        setInstaModalOpen(false);
        refetchSettings();
      } else {
        toast({ title: "Ошибка сохранения", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка соединения", variant: "destructive" });
    } finally {
      setSavingInsta(false);
    }
  }

  async function handleDisconnectInsta() {
    if (!confirm("Вы действительно хотите отключить интеграцию с Instagram Direct?")) return;

    setSavingInsta(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: "",
          instagramPageToken: "",
          instagramUsername: "",
          instagramConnected: "false",
        }),
      });
      if (res.ok) {
        toast({ title: "Instagram аккаунт отключен" });
        refetchSettings();
      }
    } catch (e) {
      toast({ title: "Ошибка при отключении", variant: "destructive" });
    } finally {
      setSavingInsta(false);
    }
  }

  async function handleSaveAltegio() {
    setSavingAltegio(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altegioCompanyId,
          altegioUserToken,
          altegioPartnerToken,
          altegioLogin,
          altegioPassword,
        }),
      });
      if (res.ok) {
        toast({ title: "Настройки Altegio сохранены" });
        refetchSettings();
      } else {
        toast({ title: "Ошибка сохранения", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Ошибка соединения", variant: "destructive" });
    } finally {
      setSavingAltegio(false);
    }
  }

  const isWaOnline = waSession?.isOnline;
  const isAltegioConfigured = Boolean(altegioCompanyId && (altegioUserToken || (altegioLogin && altegioPassword)));
  const isInstaConnected = settings.instagramConnected === "true" || Boolean(settings.instagramAccountId && settings.instagramAccountId.length > 3);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/instagram` : "https://crm.fotoidea.kz/api/webhooks/instagram";

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Altegio Import Dialog */}
      <AltegioImportDialog
        open={altegioImportOpen}
        onOpenChange={setAltegioImportOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["clients"] });
          qc.invalidateQueries({ queryKey: ["schedule"] });
        }}
      />

      {/* QR Code Dialog Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-5 w-5 text-green-600" />
              Подключение WhatsApp QR-код
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 space-y-3 text-center">
            {isWaOnline ? (
              <div className="py-6 space-y-2">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="font-bold text-lg text-slate-900">WhatsApp подключен!</h3>
                <p className="text-xs text-muted-foreground">Инстанс активен и готов к отправке сообщений</p>
              </div>
            ) : qrCodeData ? (
              <div className="space-y-3">
                <img
                  src={qrCodeData.startsWith("data:") ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 border rounded-xl shadow-md mx-auto"
                />
                <p className="text-xs text-slate-600">
                  Откройте WhatsApp на телефоне → **Связанные устройства** → **Привязать устройство**
                </p>
              </div>
            ) : (
              <div className="py-8 space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">Генерация QR-кода Evolution API…</p>
              </div>
            )}

            <Button onClick={() => setQrModalOpen(false)} className="w-full text-xs">
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram Connect / Reconnect Dialog Modal */}
      <Dialog open={instaModalOpen} onOpenChange={setInstaModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0">
                <Instagram className="h-4 w-4" />
              </div>
              Подключение Instagram Direct
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Имя пользователя Instagram (без @)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">@</span>
                <Input
                  value={instaUsername}
                  onChange={(e) => setInstaUsername(e.target.value.replace(/^@/, ""))}
                  placeholder="maqta_qyz07"
                  className="pl-7 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instagram Business Account ID
              </label>
              <Input
                value={instaAccountId}
                onChange={(e) => setInstaAccountId(e.target.value)}
                placeholder="17841441579820989"
                className="text-xs h-9 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Узнайте ID в Facebook Business Manager или Meta Developers Console
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Page Access Token (Meta Graph API)
              </label>
              <Input
                type="password"
                value={instaPageToken}
                onChange={(e) => setInstaPageToken(e.target.value)}
                placeholder="EAAG..."
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-slate-400" />
                Webhook URL (для вебхуков Facebook)
              </label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="text-xs h-9 font-mono bg-slate-50 dark:bg-slate-900" />
                <Button size="sm" variant="outline" onClick={copyWebhook} className="shrink-0 text-xs h-9">
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-green-600 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedWebhook ? "Скопировано" : "Копировать"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setInstaModalOpen(false)} className="text-xs h-9">
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={handleSaveInsta}
                disabled={savingInsta}
                className="text-xs h-9 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 text-white font-semibold shadow-xs"
              >
                {savingInsta ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Сохранить и подключить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. INSTAGRAM DIRECT SECTION (As requested) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>📷</span> Подключение Instagram Direct
        </h3>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-background shadow-2xs space-y-6">
          {/* Main Top Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Instagram Gradient Logo Circle */}
              <div className="h-12 w-12 rounded-full p-[2px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shrink-0 flex items-center justify-center shadow-xs">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-full flex items-center justify-center">
                  <Instagram className="h-6 w-6 text-[#dc2743]" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">Instagram</h2>
                <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                  Подключите чат-бот к Instagram Direct, чтобы эффективно взаимодействовать с подписчиками, поддерживать их вовлеченность и увеличивать продажи.
                </p>
              </div>
            </div>

            {isInstaConnected ? (
              <button
                onClick={handleDisconnectInsta}
                disabled={savingInsta}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline shrink-0 transition-colors self-start sm:self-auto"
              >
                Отключить
              </button>
            ) : (
              <Button
                size="sm"
                onClick={() => setInstaModalOpen(true)}
                className="text-xs font-semibold bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 text-white shrink-0 shadow-xs"
              >
                Подключить
              </Button>
            )}
          </div>

          {/* Connected Account Card Row */}
          {isInstaConnected ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Account Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-500 to-rose-500 p-[1.5px] shrink-0 shadow-2xs">
                  <div className="w-full h-full rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-xs">
                    {settings.instagramUsername ? settings.instagramUsername.slice(0, 5) : "Toomi"}
                  </div>
                </div>

                <div className="truncate">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    @{settings.instagramUsername || "maqta_qyz07"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    ID: {settings.instagramAccountId || "17841441579820989"} • Бизнес-аккаунт привязан и активен
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                  ✓ Подключено
                </span>

                <button
                  onClick={() => setInstaModalOpen(true)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline transition-colors cursor-pointer"
                >
                  Переподключить
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center bg-slate-50/40 dark:bg-slate-900/30">
              <p className="text-xs text-slate-500 mb-3">Instagram аккаунт еще не привязан</p>
              <Button
                size="sm"
                onClick={() => setInstaModalOpen(true)}
                className="text-xs font-semibold bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-95 shadow-xs"
              >
                <Instagram className="h-3.5 w-3.5 mr-1.5" />
                Подключить Instagram аккаунт
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. ALTEGIO CARD */}
      <div className="border rounded-2xl p-6 bg-background shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Altegio / Yclients</h2>
              <p className="text-xs text-muted-foreground">Синхронизация записей, клиентов и автоматический импорт данных</p>
            </div>
          </div>

          <Badge className={cn("px-3 py-1 text-xs font-semibold", isAltegioConfigured ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700")}>
            {isAltegioConfigured ? "🟢 Подключено" : "⚪ Не настроено"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              ID компании в Altegio
            </label>
            <Input
              value={altegioCompanyId}
              onChange={(e) => setAltegioCompanyId(e.target.value)}
              placeholder="123456"
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              Логин Altegio (Телефон / Email)
            </label>
            <Input
              value={altegioLogin}
              onChange={(e) => setAltegioLogin(e.target.value)}
              placeholder="+7 (777) 000-00-00"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              Пароль Altegio
            </label>
            <Input
              type="password"
              value={altegioPassword}
              onChange={(e) => setAltegioPassword(e.target.value)}
              placeholder="Пароль учетной записи"
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-slate-400" />
              User Token (опционально)
            </label>
            <Input
              type="password"
              value={altegioUserToken}
              onChange={(e) => setAltegioUserToken(e.target.value)}
              placeholder="Токен пользователя"
              className="text-xs h-9 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => setAltegioImportOpen(true)} className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Запустить импорт из Altegio
          </Button>

          <Button size="sm" onClick={handleSaveAltegio} disabled={savingAltegio} className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
            {savingAltegio ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Сохранить Altegio
          </Button>
        </div>
      </div>

      {/* 3. WHATSAPP CARD */}
      <div className="border rounded-2xl p-6 bg-background shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-200">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">WhatsApp (Evolution API)</h2>
              <p className="text-xs text-muted-foreground">Интеграция с официальным веб-сервером Evolution API</p>
            </div>
          </div>

          <Badge className={cn("px-3 py-1 text-xs font-semibold", isWaOnline ? "bg-green-500 text-white" : "bg-slate-200 text-slate-700")}>
            {isWaOnline ? "🟢 Подключено" : "🔴 Не подключено"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              URL Сервера Evolution API
            </label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://wa.gid360.kz"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
              Имя инстанса (Instance Name)
            </label>
            <Input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Fotoidea"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-slate-400" />
              API Key Сервера
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="DFF771FF-89DD-4F8A-AC52-57ACC5E93D1C"
              className="text-xs h-9 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={handleCheckQr} disabled={checkingQr} className="text-xs">
            {checkingQr ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <QrCode className="h-3.5 w-3.5 mr-1.5" />}
            Проверить статус & QR-код
          </Button>

          <Button size="sm" onClick={handleSaveWa} disabled={savingWa} className="text-xs bg-green-600 hover:bg-green-700 text-white">
            {savingWa ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Сохранить WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
