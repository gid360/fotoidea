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

  const [instaAccountId, setInstaAccountId] = useState("");
  const [instaPageToken, setInstaPageToken] = useState("");
  const [savingInsta, setSavingInsta] = useState(false);
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
      setInstaAccountId(settings.instagramAccountId || "");
      setInstaPageToken(settings.instagramPageToken || "");
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
    setSavingInsta(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: instaAccountId,
          instagramPageToken: instaPageToken,
        }),
      });
      if (res.ok) {
        toast({ title: "Настройки Instagram сохранены" });
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
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/instagram` : "https://fotoidea.kz/api/webhooks/instagram";

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="max-w-4xl space-y-6">
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

      {/* ALTEGIO CARD */}
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

      {/* WHATSAPP CARD */}
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

      {/* INSTAGRAM CARD */}
      <div className="border rounded-2xl p-6 bg-background shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-200">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Instagram Direct (Meta Graph API)</h2>
              <p className="text-xs text-muted-foreground">Прием и отправка сообщений из Instagram Direct</p>
            </div>
          </div>

          <Badge className={cn("px-3 py-1 text-xs font-semibold", instaAccountId && instaPageToken ? "bg-green-500 text-white" : "bg-slate-200 text-slate-700")}>
            {instaAccountId && instaPageToken ? "🟢 Подключено" : "⚪ Не настроено"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Instagram Business Account ID</label>
            <Input
              value={instaAccountId}
              onChange={(e) => setInstaAccountId(e.target.value)}
              placeholder="17841400000000000"
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Page Access Token</label>
            <Input
              type="password"
              value={instaPageToken}
              onChange={(e) => setInstaPageToken(e.target.value)}
              placeholder="EAAG..."
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              Webhook URL (укажите в Facebook Developers Console)
            </label>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="text-xs h-9 font-mono bg-slate-50" />
              <Button size="sm" variant="outline" onClick={copyWebhook} className="shrink-0 text-xs h-9">
                {copiedWebhook ? <Check className="h-3.5 w-3.5 text-green-600 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copiedWebhook ? "Скопировано" : "Копировать"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button size="sm" onClick={handleSaveInsta} disabled={savingInsta} className="text-xs">
            {savingInsta ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Сохранить Instagram
          </Button>
        </div>
      </div>
    </div>
  );
}
