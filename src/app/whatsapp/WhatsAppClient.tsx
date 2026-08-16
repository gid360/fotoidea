"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle, Send, Settings2, CheckCircle2, XCircle,
  Clock, RefreshCw, Wifi, WifiOff, Users, ChevronRight, UserPlus, QrCode, Search, User, Check, CheckCheck,
  CornerUpRight, Smile, Share2, FileText, Mic, Trash2, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { ru } from "date-fns/locale";

interface WaSession {
  id: string;
  isOnline: boolean;
  provider: "EVOLUTION" | "GREEN_API";
  serverUrl: string | null;
  instanceName: string | null;
  apiKey: string | null;
  gatewayId: string | null;
  apiToken: string | null;
}

interface WaMessage {
  id: string;
  phone: string;
  body: string;
  status: "QUEUED" | "SENT" | "ERROR";
  errorText: string | null;
  sentAt: string | null;
  clientId: string | null;
  createdAt: string;
}

interface WaChat {
  id: string;
  remoteJid: string;
  phone: string;
  name: string;
  profilePicUrl: string | null;
  unreadCount: number;
  updatedAt: string;
  lastMessage: string;
  fromMe: boolean;
}

interface WaChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
  status: string;
  pushName: string | null;
  reaction?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  QUEUED: { label: "В очереди", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  SENT:   { label: "Отправлено", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  ERROR:  { label: "Ошибка",    color: "bg-red-100 text-red-800",    icon: XCircle },
};

// ─── BULK SEND ───────────────────────────────────────────────────────────────
function BulkSendDialog({
  open, onClose, onSent,
}: { open: boolean; onClose: () => void; onSent: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients-list"],
    queryFn: () => fetch("/api/clients?limit=500").then(r => r.json()).then(d => d.clients ?? d),
    enabled: open,
  });

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAll = () => setSelected(filtered.map(c => c.id));

  async function handleSend() {
    if (!text.trim() || !selected.length) return;
    setSending(true);
    const toSend = clients.filter(c => selected.includes(c.id));
    for (const c of toSend) {
      await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: c.phone, body: text, clientId: c.id }),
      });
    }
    setSending(false);
    setDone(true);
    onSent();
  }

  function handleClose() {
    setSearch(""); setSelected([]); setText(""); setDone(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Массовая рассылка</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold">Сообщения поставлены в очередь</p>
            <p className="text-sm text-muted-foreground">Отправлено {selected.length} сообщений</p>
            <Button onClick={handleClose}>Закрыть</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
              {/* Client picker */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2">
                  <Input placeholder="Поиск клиента…" value={search}
                    onChange={e => setSearch(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="sm" onClick={selectAll}>Все</Button>
                  {selected.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                      Сбросить
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Выбрано: {selected.length} из {clients.length}
                </div>
                <div className="flex-1 overflow-y-auto border rounded-md divide-y min-h-0">
                  {filtered.map(c => {
                    const checked = selected.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => toggle(c.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors",
                          checked && "bg-primary/5"
                        )}>
                        <div className={cn(
                          "h-4 w-4 rounded border shrink-0 flex items-center justify-center",
                          checked ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <span className="flex-1 truncate">{c.lastName} {c.firstName}</span>
                        <span className="text-muted-foreground text-xs">{c.phone}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="w-64 shrink-0 flex flex-col gap-2">
                <Label>Текст сообщения</Label>
                <Textarea
                  placeholder="Введите текст…&#10;&#10;Можно использовать:&#10;{ФИО} - имя клиента&#10;{Телефон} - телефон"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  className="flex-1 resize-none font-mono text-sm min-h-[200px]"
                />
                <div className="text-xs text-muted-foreground">{text.length} симв.</div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={handleSend} disabled={sending || !text.trim() || !selected.length}>
                {sending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Отправка…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Отправить {selected.length > 0 ? `(${selected.length})` : ""}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function WhatsAppClient() {
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode: string | null; state: string; isOnline: boolean } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Chats state
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const [leadPhone, setLeadPhone] = useState("");
  const [leadName, setLeadName]   = useState("");
  const [leadNote, setLeadNote]   = useState("");
  const [leadSaving, setLeadSaving] = useState(false);

  // Settings form
  const [provider, setProvider] = useState<"EVOLUTION" | "GREEN_API">("EVOLUTION");
  const [serverUrl, setServerUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [gatewayId, setGatewayId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Send form
  const [sendPhone, setSendPhone] = useState("");
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);

  // Forward & Reaction state
  const [forwardMsg, setForwardMsg] = useState<{ text: string } | null>(null);
  const [forwardTargetPhone, setForwardTargetPhone] = useState("");
  const [forwardSending, setForwardSending] = useState(false);
  const [msgReactions, setMsgReactions] = useState<Record<string, string>>({});
  const [activeEmojiMsgId, setActiveEmojiMsgId] = useState<string | null>(null);

  function handleAddReaction(msgId: string, emoji: string) {
    setMsgReactions(prev => ({
      ...prev,
      [msgId]: prev[msgId] === emoji ? "" : emoji,
    }));
    toast({ title: `Реакция ${emoji} обновлена` });
  }

  async function handleForwardMsgSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forwardMsg || !forwardTargetPhone.trim()) return;
    setForwardSending(true);
    try {
      const cleanPhone = forwardTargetPhone.replace(/\D/g, "");
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          message: `[Пересланное сообщение]:\n${forwardMsg.text}`,
        }),
      });
      if (res.ok) {
        toast({ title: "Сообщение переслано!" });
        setForwardMsg(null);
        setForwardTargetPhone("");
      } else {
        toast({ title: "Ошибка пересылки", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    } finally {
      setForwardSending(false);
    }
  }

  const { data: session } = useQuery<WaSession>({
    queryKey: ["wa-session"],
    queryFn: () => fetch("/api/whatsapp/session").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: msgs, isLoading: msgsLoading } = useQuery<{ messages: WaMessage[]; total: number }>({
    queryKey: ["wa-messages"],
    queryFn: () => fetch("/api/whatsapp/messages").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: chatsData, isLoading: chatsLoading, refetch: refetchChats } = useQuery<{ chats: WaChat[] }>({
    queryKey: ["wa-chats"],
    queryFn: () => fetch("/api/whatsapp/chats").then(r => r.json()),
    refetchInterval: 15000,
    enabled: session?.provider === "EVOLUTION",
  });

  const { data: quickReplies = [] } = useQuery<{ id: string; title: string; text: string }[]>({
    queryKey: ["quick-replies"],
    queryFn: () =>
      fetch("/api/settings/quick-replies")
        .then((r) => r.json())
        .then((d) => d.replies || [])
        .catch(() => []),
  });

  const chats = chatsData?.chats ?? [];

  // Highlight chats for 1.5 seconds when new messages arrive
  const [highlightedChats, setHighlightedChats] = useState<Record<string, boolean>>({});
  const prevChatsRef = useRef<Record<string, { lastMessage: string; updatedAt: string }>>({});

  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const jid = urlParams.get("jid") || localStorage.getItem("fotoidea_selected_wa_chat_jid");
        if (jid) {
          const found = chats.find(c => c.remoteJid === jid || c.id === jid);
          if (found) {
            setSelectedChat(found);
            return;
          }
        }
      }
      setSelectedChat(chats[0]);
    }
  }, [chats, selectedChat]);

  const handleSelectChat = (c: WaChat | null) => {
    setSelectedChat(c);
    if (typeof window !== "undefined") {
      if (c) {
        localStorage.setItem("fotoidea_selected_wa_chat_jid", c.remoteJid);
        const url = new URL(window.location.href);
        url.searchParams.set("jid", c.remoteJid);
        window.history.replaceState({}, "", url.toString());
      } else {
        localStorage.removeItem("fotoidea_selected_wa_chat_jid");
      }
    }
  };

  const { data: chatMsgsData, isLoading: chatMsgsLoading, refetch: refetchChatMsgs } = useQuery<{ messages: WaChatMessage[] }>({
    queryKey: ["wa-chat-messages", selectedChat?.remoteJid],
    queryFn: () => fetch(`/api/whatsapp/chats/${encodeURIComponent(selectedChat!.remoteJid)}`).then(r => r.json()),
    refetchInterval: 8000,
    enabled: !!selectedChat,
  });

  const chatMsgs = chatMsgsData?.messages ?? [];

  const filteredChats = chats.filter(c =>
    `${c.name} ${c.phone} ${c.lastMessage}`.toLowerCase().includes(chatSearch.toLowerCase())
  );

  async function openSettings() {
    setProvider(session?.provider ?? "EVOLUTION");
    setServerUrl(session?.serverUrl ?? "");
    setInstanceName(session?.instanceName ?? "");
    setApiKey(session?.apiKey ?? "");
    setGatewayId(session?.gatewayId ?? "");
    setApiToken(session?.apiToken ?? "");
    setSettingsOpen(true);
  }

  async function saveSettings() {
    setSavingSettings(true);
    await fetch("/api/whatsapp/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        serverUrl: serverUrl || null,
        instanceName: instanceName || null,
        apiKey: apiKey || null,
        gatewayId: gatewayId || null,
        apiToken: apiToken || null,
      }),
    });
    await qc.invalidateQueries({ queryKey: ["wa-session"] });
    setSavingSettings(false);
    setSettingsOpen(false);
  }

  async function checkOrToggleStatus() {
    setCheckingStatus(true);
    if (session?.provider === "EVOLUTION") {
      await fetch("/api/whatsapp/qr");
    } else {
      await fetch("/api/whatsapp/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: !session?.isOnline }),
      });
    }
    await qc.invalidateQueries({ queryKey: ["wa-session"] });
    setCheckingStatus(false);
  }

  async function loadQrCode() {
    setQrLoading(true);
    setQrOpen(true);
    try {
      const res = await fetch("/api/whatsapp/qr").then(r => r.json());
      setQrData(res);
      qc.invalidateQueries({ queryKey: ["wa-session"] });
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  }

  // Voice Recording State & Handlers
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  async function handleMarkAllRead() {
    try {
      await fetch("/api/whatsapp/chats/read-all", { method: "POST" });
      refetchChats();
      toast({ title: "Прочитано", description: "Все сообщения отмечены как прочитанные" });
    } catch (e) {
      console.error(e);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast({ title: "Ошибка микрофона", description: "Разрешите доступ к микрофону для записи голосового сообщения.", variant: "destructive" });
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  async function stopAndSendRecording() {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.onstop = async () => {
      const durationStr = formatDuration(recordingSeconds);
      if (selectedChat) {
        setReplySending(true);
        try {
          await fetch(`/api/whatsapp/chats/${encodeURIComponent(selectedChat.remoteJid)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `🎤 Голосовое сообщение (${durationStr})`,
            }),
          });
          refetchChatMsgs();
          refetchChats();
          toast({ title: "Голосовое сообщение", description: "Голосовое сообщение отправлено" });
        } catch (err) {
          console.error("Error sending voice message:", err);
        } finally {
          setReplySending(false);
        }
      }

      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingSeconds(0);
    };

    mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
  }

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  async function handleSendReply() {
    if (!selectedChat || !replyText.trim()) return;
    setReplySending(true);
    await fetch("/api/whatsapp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: selectedChat.phone, body: replyText }),
    });
    setReplyText("");
    setReplySending(false);
    setTimeout(() => {
      refetchChatMsgs();
      refetchChats();
    }, 1000);
  }

  async function handleSend() {
    if (!sendPhone.trim() || !sendText.trim()) return;
    setSending(true);
    await fetch("/api/whatsapp/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: sendPhone, body: sendText }),
    });
    qc.invalidateQueries({ queryKey: ["wa-messages"] });
    setSending(false);
    setSendOpen(false);
    setSendPhone(""); setSendText("");
  }

  async function handleCreateLead() {
    if (!leadPhone.trim() && !leadName.trim()) return;
    setLeadSaving(true);
    await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "WHATSAPP",
        name:   leadName || undefined,
        phone:  leadPhone || undefined,
        note:   leadNote || undefined,
      }),
    });
    setLeadSaving(false);
    setLeadOpen(false);
    setLeadName(""); setLeadPhone(""); setLeadNote("");
  }

  const isOnline = session?.isOnline ?? false;
  const currentProvider = session?.provider ?? "EVOLUTION";
  const hasConfig = currentProvider === "EVOLUTION"
    ? !!(session?.serverUrl && session?.instanceName && session?.apiKey)
    : !!(session?.gatewayId && session?.apiToken);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Диалоги и рассылки (Evolution API)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSettings}>
            <Settings2 className="h-4 w-4 mr-2" />Настройки
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Users className="h-4 w-4 mr-2" />Рассылка
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLeadOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />В воронку
          </Button>
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Send className="h-4 w-4 mr-2" />Отправить
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 max-w-7xl mx-auto w-full min-h-0">

        {/* Connection status banner */}
        <div className={cn(
          "rounded-xl border p-3.5 flex items-center justify-between shrink-0",
          isOnline ? "border-green-200 bg-green-50/70" : "border-muted bg-muted/30"
        )}>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold text-sm leading-none">
                {isOnline ? "WhatsApp подключён" : "WhatsApp не подключён"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasConfig
                  ? (currentProvider === "EVOLUTION"
                    ? `Evolution API: ${session?.serverUrl} (${session?.instanceName})`
                    : `Green API: инстанс ${session?.gatewayId}`)
                  : "Укажите настройки подключения"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasConfig && (
              <Button variant="outline" size="sm" onClick={openSettings}>
                <ChevronRight className="h-4 w-4 mr-1" />Настроить
              </Button>
            )}
            {currentProvider === "EVOLUTION" && hasConfig && (
              <Button variant="outline" size="sm" onClick={loadQrCode}>
                <QrCode className="h-4 w-4 mr-1.5" />QR-код
              </Button>
            )}
            <Button
              variant={isOnline ? "outline" : "default"}
              size="sm"
              onClick={checkOrToggleStatus}
              disabled={(!hasConfig && !isOnline) || checkingStatus}
            >
              {checkingStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isOnline ? (
                "Обновить статус"
              ) : (
                "Проверить / Подключить"
              )}
            </Button>
          </div>
        </div>

        {/* Main Workspace Tabs */}
        <Tabs defaultValue="dialogs" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-fit">
            <TabsTrigger value="dialogs">Чаты и диалоги</TabsTrigger>
            <TabsTrigger value="history">История отправки</TabsTrigger>
          </TabsList>

          {/* TAB 1: LIVE CHATS & DIALOGS */}
          <TabsContent value="dialogs" className="flex-1 min-h-0 pt-3 flex gap-4 overflow-hidden">
            {/* Chats List Sidebar */}
            <div className="w-80 border rounded-xl flex flex-col bg-background shrink-0 min-h-0">
              <div className="p-3 border-b space-y-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Поиск чата…"
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Всего диалогов: {filteredChats.length}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleMarkAllRead}
                      title="Отметить все прочитанными"
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded transition-colors"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                    <button onClick={() => refetchChats()} className="hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y min-h-0">
                {chatsLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Загрузка диалогов…
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Диалоги не найдены
                  </div>
                ) : (
                  filteredChats.map(c => {
                    const isSelected = selectedChat?.id === c.id;
                    const isHighlighted = !!highlightedChats[c.id];

                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectChat(c)}
                        className={cn(
                          "w-full p-3 text-left flex items-start gap-3 transition-all duration-500 relative overflow-hidden",
                          isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50",
                          isHighlighted && "bg-emerald-500/25 ring-2 ring-emerald-500/50 shadow-inner"
                        )}
                      >
                        {/* Emerald 1.5-second indicator strip on left edge */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 transition-all duration-300",
                            isHighlighted ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                          )}
                        />
                        {c.profilePicUrl ? (
                          <img src={c.profilePicUrl} alt={c.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 font-semibold text-sm">
                            {c.name.substring(0, 1).toUpperCase() || <User className="h-5 w-5" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs truncate">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(c.updatedAt), "HH:mm", { locale: ru })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.fromMe && <span className="text-primary font-medium mr-1">Вы:</span>}
                            {c.lastMessage}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">+{c.phone}</p>
                        </div>
                        {c.unreadCount > 0 && (
                          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full shrink-0">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Chat Thread */}
            <div className="flex-1 border rounded-xl flex flex-col bg-background min-h-0">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center justify-between bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                      {selectedChat.profilePicUrl ? (
                        <img src={selectedChat.profilePicUrl} alt={selectedChat.name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                          {selectedChat.name.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-sm leading-none">{selectedChat.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">+{selectedChat.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLeadName(selectedChat.name);
                          setLeadPhone("+" + selectedChat.phone);
                          setLeadOpen(true);
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />В воронку
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => refetchChatMsgs()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-slate-50/50">
                    {chatMsgsLoading ? (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />Загрузка истории…
                      </div>
                    ) : chatMsgs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        Сообщений пока нет
                      </div>
                    ) : (
                      chatMsgs.map(m => {
                        const reaction = msgReactions[m.id] || m.reaction;
                        return (
                          <div
                            key={m.id}
                            className={cn("flex flex-col max-w-[75%] group relative", m.fromMe ? "ml-auto items-end" : "mr-auto items-start")}
                          >
                            {/* Quick Actions Bar (Expandable Emoji & Forward) */}
                            <div className={cn(
                              "absolute -top-3.5 z-20 hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-md text-xs",
                              m.fromMe ? "right-2" : "left-2"
                            )}>
                              {/* Inline Emoji Trigger & Floating Selector with Hover Bridge */}
                              <div
                                className="relative flex items-center"
                                onMouseLeave={() => setActiveEmojiMsgId(null)}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveEmojiMsgId(activeEmojiMsgId === m.id ? null : m.id);
                                  }}
                                  onMouseEnter={() => setActiveEmojiMsgId(m.id)}
                                  className="p-1 text-slate-500 hover:text-amber-500 hover:scale-110 transition-transform flex items-center justify-center rounded-full hover:bg-slate-100"
                                  title="Добавить реакцию"
                                >
                                  {reaction ? <span className="text-xs leading-none">{reaction}</span> : <Smile className="h-3.5 w-3.5" />}
                                </button>

                                {/* Floating Emoji Bar with pb-1.5 hover bridge touching the trigger button */}
                                {activeEmojiMsgId === m.id && (
                                  <div className={cn("absolute bottom-full pb-1.5 z-30", m.fromMe ? "right-0" : "left-0")}>
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-xl animate-in fade-in-50 zoom-in-95 whitespace-nowrap">
                                      {["👍", "👌", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddReaction(m.id, emoji);
                                            setActiveEmojiMsgId(null);
                                          }}
                                          className="hover:scale-130 transition-transform p-0.5 text-sm leading-none rounded-full hover:bg-slate-100"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="w-[1px] h-3 bg-slate-200 my-auto" />

                              {/* Forward Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setForwardMsg({ text: m.text });
                                  setForwardTargetPhone(selectedChat?.phone || "");
                                }}
                                title="Переслать сообщение"
                                className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                <CornerUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-xs shadow-sm whitespace-pre-wrap leading-relaxed relative",
                                m.fromMe ? "bg-green-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
                              )}
                            >
                              {m.text}

                              {/* Display attached Reaction Badge */}
                              {reaction && (
                                <div className="absolute -bottom-2 right-2 bg-white border border-slate-200 text-slate-800 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm font-semibold leading-none flex items-center gap-0.5">
                                  <span>{reaction}</span>
                                </div>
                              )}
                            </div>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1">
                            <span>{format(new Date(m.timestamp), "HH:mm", { locale: ru })}</span>
                            {m.fromMe && <CheckCheck className="h-3 w-3 text-green-600" />}
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inline Quick Reply & Voice Box */}
                  <div className="p-3 border-t bg-background shrink-0 flex items-center gap-2 relative">
                    {/* Quick Replies Dropdown Icon */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-foreground shrink-0" title="Быстрые ответы / Шаблоны">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80 p-2 space-y-1 text-xs">
                        <div className="font-semibold text-xs text-slate-700 px-2 py-1 border-b mb-1 flex items-center justify-between">
                          <span>Быстрые ответы / Шаблоны</span>
                        </div>
                        {quickReplies.length === 0 ? (
                          <div className="p-3 text-center text-[11px] text-muted-foreground">
                            Шаблоны не найдены
                          </div>
                        ) : (
                          quickReplies.map((tmpl) => (
                            <button
                              key={tmpl.id}
                              onClick={() => setReplyText(tmpl.text)}
                              className="w-full text-left p-2 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <p className="font-medium text-slate-900">{tmpl.title}</p>
                              <p className="text-slate-500 text-[11px] truncate mt-0.5">{tmpl.text}</p>
                            </button>
                          ))
                        )}
                        <div className="pt-1.5 border-t mt-1">
                          <Link
                            href="/settings/quick-replies"
                            className="flex items-center justify-center gap-1.5 text-[11px] text-primary hover:underline font-semibold w-full py-1 text-center"
                          >
                            ⚙️ Настроить быстрые ответы
                          </Link>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Input or Voice Recording Bar */}
                    {isRecording ? (
                      <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 animate-pulse">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                        <span className="text-xs font-semibold text-red-700">Запись... {formatDuration(recordingSeconds)}</span>
                        <div className="flex-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100 shrink-0" onClick={cancelRecording} title="Отмена">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-7 px-2 text-xs shrink-0" onClick={stopAndSendRecording}>
                          <Send className="h-3.5 w-3.5 mr-1" />Отправить
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          placeholder="Напишите ответ…"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                          className="flex-1 text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-red-600 hover:border-red-200 shrink-0"
                          onClick={startRecording}
                          title="Записать голосовое сообщение"
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSendReply} disabled={replySending || !replyText.trim()} size="sm" className="shrink-0">
                          {replySending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="font-medium text-sm">Выберите чат для просмотра сообщений</p>
                  <p className="text-xs mt-1">Выберите диалог слева для ответа и просмотра переписки</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: HISTORIC LOG TABLE */}
          <TabsContent value="history" className="flex-1 min-h-0 pt-3 overflow-y-auto">
            <div className="space-y-4">
              {msgs && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Всего отправлено из CRM", value: msgs.total, color: "text-foreground" },
                    { label: "Успешно доставлено",       value: msgs.messages.filter(m => m.status === "SENT").length, color: "text-green-600" },
                    { label: "Ошибки",                   value: msgs.messages.filter(m => m.status === "ERROR").length, color: "text-red-500" },
                  ].map(s => (
                    <div key={s.label} className="border rounded-xl p-4 text-center">
                      <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-36">Дата</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-36">Телефон</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Сообщение</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-28">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {msgsLoading ? (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Загрузка…</td></tr>
                    ) : !msgs?.messages?.length ? (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Нет сообщений</td></tr>
                    ) : (
                      msgs.messages.map(m => {
                        const st = STATUS_LABELS[m.status] || STATUS_LABELS.QUEUED;
                        const Icon = st.icon;
                        return (
                          <tr key={m.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {format(new Date(m.createdAt), "dd.MM HH:mm", { locale: ru })}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">+{m.phone}</td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="truncate">{m.body}</p>
                              {m.errorText && (
                                <p className="text-xs text-red-500 mt-0.5">{m.errorText}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", st.color)}>
                                <Icon className="h-3 w-3" />
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки WhatsApp</DialogTitle>
          </DialogHeader>

          <Tabs value={provider} onValueChange={v => setProvider(v as "EVOLUTION" | "GREEN_API")} className="w-full py-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="EVOLUTION">Evolution API</TabsTrigger>
              <TabsTrigger value="GREEN_API">Green API</TabsTrigger>
            </TabsList>

            <TabsContent value="EVOLUTION" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>URL сервера Evolution API</Label>
                <Input
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="https://wa.gid360.kz"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Имя инстанса (Instance Name)</Label>
                <Input
                  value={instanceName}
                  onChange={e => setInstanceName(e.target.value)}
                  placeholder="Fotoidea"
                />
              </div>
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="DFF771FF-89DD-4F8A-AC52-57ACC5E93D1C"
                  type="password"
                />
              </div>
            </TabsContent>

            <TabsContent value="GREEN_API" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>ID инстанса (idInstance)</Label>
                <Input
                  value={gatewayId}
                  onChange={e => setGatewayId(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-1.5">
                <Label>API токен (apiTokenInstance)</Label>
                <Input
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="abc123..."
                  type="password"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Отмена</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm flex flex-col items-center text-center">
          <DialogHeader>
            <DialogTitle>Подключение WhatsApp (QR-код)</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center min-h-[220px] w-full">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-xs">Загрузка QR-кода из Evolution API…</p>
              </div>
            ) : qrData?.isOnline ? (
              <div className="flex flex-col items-center gap-2 text-green-600">
                <CheckCircle2 className="h-12 w-12" />
                <p className="font-semibold text-sm">WhatsApp уже подключён и готов к работе!</p>
              </div>
            ) : qrData?.qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <div className="border p-2 rounded-xl bg-white shadow-sm">
                  {qrData.qrCode.startsWith("data:image") ? (
                    <img src={qrData.qrCode} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
                  ) : (
                    <img src={`data:image/png;base64,${qrData.qrCode}`} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Откройте WhatsApp на телефоне → <strong>Связанные устройства</strong> → <strong>Привязать устройство</strong> и отсканируйте код.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <XCircle className="h-10 w-10 text-red-400" />
                <p className="text-sm font-medium">Не удалось получить QR-код</p>
                <p className="text-xs">Проверьте корректность URL, имени инстанса и API Key в настройках.</p>
              </div>
            )}
          </div>
          <DialogFooter className="w-full flex gap-2">
            <Button variant="outline" className="flex-1" onClick={loadQrCode} disabled={qrLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1.5", qrLoading && "animate-spin")} />
              Обновить QR
            </Button>
            <Button variant="default" className="flex-1" onClick={() => setQrOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отправить сообщение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Телефон</Label>
              <Input value={sendPhone} onChange={e => setSendPhone(e.target.value)}
                placeholder="+7 777 123 45 67" />
            </div>
            <div className="space-y-1.5">
              <Label>Текст</Label>
              <Textarea value={sendText} onChange={e => setSendText(e.target.value)}
                placeholder="Введите текст сообщения…"
                rows={4} className="resize-none" />
            </div>
            {!isOnline && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                WhatsApp не подключён - сообщение будет сохранено со статусом «В очереди»
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Отмена</Button>
            <Button onClick={handleSend} disabled={sending || !sendPhone.trim() || !sendText.trim()}>
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Отправить</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <BulkSendDialog open={bulkOpen} onClose={() => setBulkOpen(false)}
        onSent={() => { qc.invalidateQueries({ queryKey: ["wa-messages"] }); }} />

      {/* Create CRM lead from WhatsApp */}
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить лид из WhatsApp в воронку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Лид попадёт в воронку продаж с источником <strong>WhatsApp</strong>.
            </p>
            <div className="space-y-1.5">
              <Label>Имя</Label>
              <Input value={leadName} onChange={e => setLeadName(e.target.value)}
                placeholder="Имя из переписки" />
            </div>
            <div className="space-y-1.5">
              <Label>Телефон</Label>
              <Input value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                placeholder="+7 777 123 45 67" />
            </div>
            <div className="space-y-1.5">
              <Label>Заметка</Label>
              <Input value={leadNote} onChange={e => setLeadNote(e.target.value)}
                placeholder="Интересуется работой..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateLead} disabled={leadSaving || (!leadPhone.trim() && !leadName.trim())}>
              {leadSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" />Добавить в воронку</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Message Dialog */}
      <Dialog open={!!forwardMsg} onOpenChange={v => !v && setForwardMsg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CornerUpRight className="h-5 w-5 text-violet-600" />
              <span>Переслать сообщение</span>
            </DialogTitle>
          </DialogHeader>

          {forwardMsg && (
            <div className="space-y-3 pt-1">
              <div className="bg-slate-50 border p-2.5 rounded-xl text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Пересылаемое сообщение:</p>
                <p className="text-slate-800 italic line-clamp-3">{forwardMsg.text}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Поиск получателя (по имени или номеру):
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Введите имя или номер телефона…"
                    value={forwardTargetPhone}
                    onChange={(e) => setForwardTargetPhone(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              {/* Filtered List of Chats */}
              <div className="max-h-56 overflow-y-auto divide-y border rounded-xl bg-slate-50/50">
                {(() => {
                  const qRaw = forwardTargetPhone.toLowerCase().trim();
                  const qDigits = forwardTargetPhone.replace(/\D/g, "");
                  const filtered = chats.filter(c => {
                    if (!qRaw && !qDigits) return true;
                    const nameLower = (c.name || "").toLowerCase();
                    const phoneClean = (c.phone || c.remoteJid || "").replace(/\D/g, "");
                    return (qDigits && phoneClean.includes(qDigits)) || (qRaw && nameLower.includes(qRaw));
                  }).slice(0, 10);

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {forwardTargetPhone ? "Чаты не найдены" : "Список чатов пуст"}
                      </div>
                    );
                  }

                  return filtered.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        const clean = c.phone.replace(/\D/g, "");
                        fetch("/api/whatsapp/messages", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone: clean, body: `[Переслано]: ${forwardMsg.text}` }),
                        }).then(() => {
                          toast({ title: "Сообщение переслано!" });
                          setForwardMsg(null);
                          setForwardTargetPhone("");
                        });
                      }}
                      className="p-2.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="truncate">
                        <p className="font-semibold text-xs text-slate-900 truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">+{c.phone}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs shrink-0">
                        Отправить
                      </Button>
                    </div>
                  ));
                })()}
              </div>

              {/* Manual Send Fallback */}
              {forwardTargetPhone.replace(/\D/g, "").length >= 5 && (
                <Button
                  size="sm"
                  className="w-full text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white mt-1"
                  onClick={() => {
                    const clean = forwardTargetPhone.replace(/\D/g, "");
                    fetch("/api/whatsapp/messages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ phone: clean, body: `[Переслано]: ${forwardMsg.text}` }),
                    }).then(() => {
                      toast({ title: "Сообщение переслано!" });
                      setForwardMsg(null);
                      setForwardTargetPhone("");
                    });
                  }}
                >
                  <CornerUpRight className="h-3.5 w-3.5" />
                  Отправить на номер {forwardTargetPhone}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
