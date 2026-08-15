"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Send, Search, RefreshCw, Paperclip, Smile, Check, CheckCheck,
  UserPlus, FileText, X, ArrowLeft, Phone, Info, Image as ImageIcon, Play, Pause, Volume2, Video, Download,
  Mic, Trash2, CornerUpRight, Share2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { AvatarLightbox } from "./AvatarLightbox";
import { ChannelBadge } from "./ChannelBadge";
import type { ConversationDetailDto, MessageDto, ConversationListItemDto } from "./types";
import { clientDisplayName, formatPhonePretty } from "./types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const QUICK_REPLIES = [
  { title: "Приветствие", text: "Здравствуйте! Фотостудия FOTOIDEA рада вам помочь. На какую дату и время вы бы хотели забронировать съемку?" },
  { title: "Адрес и вход", text: "Наш адрес: г. Уральск, пр. Абулхаир хана 147, ЖК Азимут, 1 этаж (вход со двора). Ждем вас!" },
  { title: "Оплата Kaspi", text: "Оплату брони вы можете произвести через Kaspi QR или наличными администратору перед началом съемки." },
  { title: "Сертификаты", text: "Подарочный сертификат можно приобрести как в электронном виде, так и в брендированном бумажном конверте." },
];

function formatDateHeader(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return "Сегодня";
    if (isYesterday) return "Вчера";
    return format(d, "d MMMM yyyy", { locale: ru });
  } catch {
    return "";
  }
}

function AudioMessagePlayer({ src, isOutgoing }: { src: string; isOutgoing: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fotoidea_audio_speed");
      if (saved) return parseFloat(saved);
    }
    return 1;
  });

  useEffect(() => {
    const handleSpeedChange = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("fotoidea_audio_speed");
        if (saved) {
          const val = parseFloat(saved);
          setSpeed(val);
          if (audioRef.current) {
            audioRef.current.playbackRate = val;
          }
        }
      }
    };
    window.addEventListener("fotoidea_audio_speed_change", handleSpeedChange);
    return () => window.removeEventListener("fotoidea_audio_speed_change", handleSpeedChange);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const cycleSpeed = () => {
    let nextSpeed = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    localStorage.setItem("fotoidea_audio_speed", String(nextSpeed));
    window.dispatchEvent(new Event("fotoidea_audio_speed_change"));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const applyPlaybackRate = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-xl border my-1 min-w-[200px]", isOutgoing ? "bg-[#103e2c] border-white/20 text-white" : "bg-slate-100 border-slate-200 text-slate-800")}>
      <button
        onClick={togglePlay}
        className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95", isOutgoing ? "bg-white text-[#144d37]" : "bg-[#144d37] text-white")}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] opacity-80 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : "🎤 Голосовое"}</span>
        </div>
        <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-100"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      <button
        onClick={cycleSpeed}
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 min-w-[32px] text-center transition-all duration-100 hover:scale-105 active:scale-95",
          isOutgoing
            ? "border-white/30 hover:bg-white/10 text-white bg-transparent"
            : "border-slate-300 hover:bg-slate-200 text-slate-700 bg-white"
        )}
      >
        {speed}x
      </button>

      <audio
        ref={audioRef}
        src={src}
        onPlay={() => {
          setPlaying(true);
          applyPlaybackRate();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = speed;
          }
        }}
      />
    </div>
  );
}

export function ChatPanel({
  conversation,
  onRefresh,
  onOpenClientPanel,
}: {
  conversation: ConversationDetailDto;
  onRefresh: () => void;
  onOpenClientPanel?: () => void;
}) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string; isVideo?: boolean; isPdf?: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const client = conversation.client;
  const messages = conversation.messages || [];

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const [visibleMessagesCount, setVisibleMessagesCount] = useState(15);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleMessagesCount(15);
  }, [conversation.id]);

  const displayedMessages = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredMessages;
    }
    return filteredMessages.slice(-visibleMessagesCount);
  }, [filteredMessages, visibleMessagesCount, searchQuery]);

  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 60 && !isLoadingOlder && visibleMessagesCount < filteredMessages.length && !searchQuery.trim()) {
      setIsLoadingOlder(true);
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      setVisibleMessagesCount((prev) => Math.min(prev + 15, filteredMessages.length));

      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          const newScrollHeight = chatContainerRef.current.scrollHeight;
          chatContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        }
        setIsLoadingOlder(false);
      });
    }
  };

  useEffect(() => {
    if (!isLoadingOlder) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [conversation.id, displayedMessages.length]);

  const [msgReactions, setMsgReactions] = useState<Record<string, string>>({});
  const [activeEmojiMsgId, setActiveEmojiMsgId] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<MessageDto | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");

  // Context menu (right-click) & edit message states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: MessageDto } | null>(null);
  const [editingMsg, setEditingMsg] = useState<MessageDto | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  async function handleReact(messageId: string, emoji: string, fromMe: boolean) {
    if (!messageId) return;

    // Optimistic UI update
    setMsgReactions((prev) => ({
      ...prev,
      [messageId]: emoji,
    }));

    try {
      const res = await fetch("/api/whatsapp/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteJid: conversation.remoteJid,
          messageId,
          fromMe,
          reaction: emoji,
        }),
      });

      if (!res.ok) {
        console.error("Failed to send reaction to WhatsApp");
      } else {
        onRefresh();
      }
    } catch (e) {
      console.error("Error sending reaction:", e);
    }
  }

  async function handleSaveEdit() {
    if (!editingMsg || !editText.trim() || savingEdit) return;
    setSavingEdit(true);

    try {
      const res = await fetch("/api/whatsapp/messages/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteJid: conversation.remoteJid,
          messageId: editingMsg.id,
          text: editText.trim(),
        }),
      });

      const json = await res.json();
      setSavingEdit(false);

      if (!res.ok) {
        alert(json.error || "Не удалось отредактировать сообщение");
        return;
      }

      setEditingMsg(null);
      setEditText("");
      onRefresh();
    } catch (e: any) {
      setSavingEdit(false);
      alert(e.message || "Ошибка сети при редактировании");
    }
  }

  const { data: allConversations = [] } = useQuery<ConversationListItemDto[]>({
    queryKey: ["conversations-list"],
    queryFn: () => fetch("/api/conversations").then((r) => r.json()).catch(() => []),
    enabled: forwardModalOpen,
  });

  const filteredForwardTargets = useMemo(() => {
    const qRaw = forwardSearch.toLowerCase().trim();
    const qDigits = forwardSearch.replace(/\D/g, "");
    if (!qRaw && !qDigits) return allConversations.slice(0, 10);

    return allConversations.filter((c) => {
      const nameLower = (c.client?.name || "").toLowerCase();
      const phoneClean = (c.client?.phone || c.id || "").replace(/\D/g, "");
      return (qDigits && phoneClean.includes(qDigits)) || (qRaw && nameLower.includes(qRaw));
    });
  }, [allConversations, forwardSearch]);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const handleForwardMessage = async (targetPhone: string) => {
    if (!forwardingMsg) return;
    setSending(true);
    try {
      await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: targetPhone,
          body: `[Переслано]: ${forwardingMsg.text || "Медиафайл"}`,
        }),
      });
      setForwardModalOpen(false);
      setForwardingMsg(null);
      onRefresh();
    } catch (e) {
      console.error("Error forwarding message:", e);
    } finally {
      setSending(false);
    }
  };

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
      console.error("Error accessing microphone:", err);
      alert("Разрешите доступ к микрофону для записи голосового сообщения.");
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
      setSending(true);
      try {
        await fetch("/api/whatsapp/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: client.phone,
            body: `🎤 Голосовое сообщение (${durationStr})`,
            clientId: client.id,
          }),
        });
        setTimeout(() => {
          onRefresh();
        }, 800);
      } catch (err) {
        console.error("Error sending voice message:", err);
      } finally {
        setSending(false);
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

  async function handleSend() {
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: client.phone,
          body: inputText,
          clientId: client.id,
        }),
      });
      setInputText("");
      setTimeout(() => {
        onRefresh();
      }, 800);
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 border-x min-w-0">
      {/* Lightbox Modal */}
      {lightbox && (
        <AvatarLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          isVideo={lightbox.isVideo}
          isPdf={lightbox.isPdf}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Top Header */}
      <div className="p-3 border-b bg-background flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="relative cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => client.avatarUrl && setLightbox({ src: client.avatarUrl, alt: clientDisplayName(client) })}
          >
            <Avatar src={client.avatarUrl} name={clientDisplayName(client)} size="md" />
            <ChannelBadge channel={client.channel} className="absolute -bottom-1 -right-1" />
          </div>
          <div className="min-w-0 cursor-pointer" onClick={onOpenClientPanel}>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm truncate text-slate-900">{clientDisplayName(client)}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600">
                {formatPhonePretty(client.phone)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              Нажмите для просмотра карточки клиента
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showSearch ? (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по переписке…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none w-36"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="p-0.5 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={onOpenClientPanel}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {/* Load older messages button / indicator */}
        {visibleMessagesCount < filteredMessages.length && !searchQuery.trim() && (
          <div className="flex justify-center py-1 select-none">
            <button
              onClick={() => setVisibleMessagesCount((prev) => Math.min(prev + 15, filteredMessages.length))}
              className="text-[11px] text-primary bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <RefreshCw className={cn("h-3 w-3", isLoadingOlder && "animate-spin")} />
              <span>Показать предыдущие сообщения ({filteredMessages.length - visibleMessagesCount})</span>
            </button>
          </div>
        )}

        {displayedMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {searchQuery ? "Сообщения не найдены" : "История переписки пуста. Напишите сообщение ниже."}
          </div>
        ) : (
          displayedMessages.map((m, i) => {
            const isOutgoing = m.direction === "OUTGOING";
            const prevMsg = i > 0 ? displayedMessages[i - 1] : null;
            const msgDateStr = m.createdAt ? format(new Date(m.createdAt), "yyyy-MM-dd") : "";
            const prevDateStr = prevMsg?.createdAt ? format(new Date(prevMsg.createdAt), "yyyy-MM-dd") : "";
            const showDateHeader = i === 0 || msgDateStr !== prevDateStr;

            const allReactions = Array.from(new Set([
              ...(Array.isArray(m.reactions) ? m.reactions : []),
              ...(msgReactions[m.id] ? [msgReactions[m.id]] : [])
            ])).filter(Boolean);

            return (
              <div key={m.id || i} className="space-y-2">
                {/* Date header separator */}
                {showDateHeader && (
                  <div className="flex justify-center my-3 select-none sticky top-1 z-10">
                    <span className="bg-slate-200/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-medium shadow-2xs border border-slate-300/40 dark:border-slate-700/50">
                      {formatDateHeader(m.createdAt)}
                    </span>
                  </div>
                )}

                <div className={cn("flex flex-col max-w-[75%] group relative animate-in fade-in-50 slide-in-from-bottom-2 duration-200", isOutgoing ? "ml-auto items-end" : "mr-auto items-start")}>
                  {/* Quick Hover Actions (Expandable Emoji Picker & Forward) */}
                  <div className={cn(
                    "absolute -top-3.5 z-20 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-1.5 py-0.5 shadow-md text-xs",
                    isOutgoing ? "right-2" : "left-2"
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
                        className="p-1 text-slate-500 hover:text-amber-500 hover:scale-110 transition-transform flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Добавить реакцию"
                      >
                        {allReactions.length > 0 ? <span className="text-xs leading-none">{allReactions[0]}</span> : <Smile className="h-3.5 w-3.5" />}
                      </button>

                      {/* Floating Emoji Bar with pb-1.5 hover bridge touching the trigger button */}
                      {activeEmojiMsgId === m.id && (
                        <div className={cn("absolute bottom-full pb-1.5 z-30", isOutgoing ? "right-0" : "left-0")}>
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1 shadow-xl animate-in fade-in-50 zoom-in-95 whitespace-nowrap">
                            {["👍", "👌", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReact(m.id, emoji, isOutgoing);
                                  setActiveEmojiMsgId(null);
                                }}
                                className="hover:scale-130 transition-transform p-0.5 text-sm leading-none rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 my-auto" />

                    {/* Edit Pencil Button (for outgoing text messages) */}
                    {isOutgoing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMsg(m);
                          setEditText(m.text || "");
                        }}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                        title="Редактировать сообщение"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Forward Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setForwardingMsg(m);
                        setForwardModalOpen(true);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      title="Переслать сообщение"
                    >
                      <CornerUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        message: m,
                      });
                    }}
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap break-words relative select-text",
                      isOutgoing
                        ? "bg-[#144d37] text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none"
                    )}
                  >
                    {/* AUDIO MESSAGE */}
                    {m.mediaType === "AUDIO" || (m.mediaUrl && (m.text?.includes("🎤") || m.mediaUrl.includes("audio"))) ? (
                      <AudioMessagePlayer src={m.mediaUrl || ""} isOutgoing={isOutgoing} />
                    ) : null}

                    {/* IMAGE MESSAGE */}
                    {(m.mediaType === "IMAGE" || (m.mediaUrl && !m.mediaUrl.includes("audio") && !m.mediaUrl.includes("video") && (m.mediaType as any) !== "DOCUMENT" && /\.(jpe?g|png|gif|webp|svg|bmp)(?:\?.*)?$/i.test(m.mediaUrl))) ? (
                      <div
                        className="mb-2 rounded-xl overflow-hidden border border-black/10 cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setLightbox({ src: m.mediaUrl!, alt: "Изображение из чата" })}
                      >
                        <img src={m.mediaUrl!} alt="Вложение" className="max-h-64 object-cover w-full rounded-xl" referrerPolicy="no-referrer" />
                      </div>
                    ) : null}

                    {/* VIDEO MESSAGE */}
                    {m.mediaType === "VIDEO" || (m.mediaUrl && m.mediaUrl.includes("video")) ? (
                      <div
                        className="mb-2 rounded-xl overflow-hidden border border-black/10 relative group cursor-pointer"
                        onClick={() => setLightbox({ src: m.mediaUrl!, isVideo: true })}
                      >
                        <video src={m.mediaUrl!} className="max-h-64 object-cover w-full rounded-xl" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* DOCUMENT MESSAGE */}
                    {((m.mediaType as any) === "DOCUMENT" || (m.mediaUrl && ((m.mediaType as any) === "DOCUMENT" || /\.(pdf|docx?|xlsx?|pptx?|zip|rar|tar|txt|csv)(?:\?.*)?$/i.test(m.mediaUrl)))) ? (
                      (() => {
                        const filename = m.fileName || (m.mediaUrl?.startsWith("data:") ? "Документ.pdf" : m.mediaUrl?.split("/").pop()?.split("?")[0]) || "Скачать файл";
                        const isPdf = !!(
                          filename.toLowerCase().endsWith(".pdf") ||
                          m.fileName?.toLowerCase().endsWith(".pdf") ||
                          m.mediaUrl?.toLowerCase().includes(".pdf") ||
                          m.mediaUrl?.startsWith("data:application/pdf") ||
                          m.mediaUrl?.startsWith("data:application/x-pdf") ||
                          (m.mediaUrl?.startsWith("data:") && m.mediaUrl?.includes("JVBERi0"))
                        );
                        const rawUrl = m.mediaUrl || "";
                        const safeUrl = rawUrl.includes("mmg.whatsapp.net")
                          ? `/api/whatsapp/media?id=${encodeURIComponent(m.id)}&jid=${encodeURIComponent(conversation?.remoteJid || "")}&filename=${encodeURIComponent(filename)}`
                          : rawUrl;
                        const downloadUrl = safeUrl.startsWith("/api/whatsapp/media")
                          ? (safeUrl.includes("download=1") ? safeUrl : `${safeUrl}&download=1`)
                          : safeUrl;
                        
                        if (isPdf) {
                          return (
                            <div
                              onClick={() => setLightbox({ src: safeUrl, isPdf: true })}
                              className="flex items-center gap-2 p-2 rounded-lg bg-black/10 hover:bg-black/15 transition-colors mb-1 text-current font-medium cursor-pointer"
                            >
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="truncate flex-1 hover:underline">{filename}</span>
                              <a
                                href={downloadUrl || "#"}
                                download={filename}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-black/15 rounded transition-colors"
                                title="Скачать"
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            </div>
                          );
                        }
                        
                        return (
                          <a
                            href={downloadUrl || "#"}
                            download={filename}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-black/10 hover:bg-black/15 transition-colors mb-1 text-current font-medium"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{filename}</span>
                            <Download className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        );
                      })()
                    ) : null}

                    {m.text ? <p>{m.text}</p> : (!m.mediaUrl && <p className="italic text-slate-400 font-medium">[Сообщение]</p>)}

                    {/* Reaction badge */}
                    {allReactions.length > 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReact(m.id, "", isOutgoing);
                        }}
                        className="absolute -bottom-2.5 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm font-semibold leading-none flex items-center gap-0.5 z-10 cursor-pointer select-none hover:scale-105 transition-transform"
                        title="Нажмите, чтобы убрать реакцию"
                      >
                        {allReactions.map((r, idx) => (
                          <span key={idx}>{r}</span>
                        ))}
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex items-center gap-1.5 mt-1 text-[10px] justify-end select-none",
                        isOutgoing ? "text-green-100" : "text-slate-400"
                      )}
                    >
                      {m.isEdited && (
                        <span className="italic font-medium opacity-90 text-[9px] bg-black/10 dark:bg-white/10 px-1 py-0.2 rounded">
                          Изменено
                        </span>
                      )}
                      <span>{format(new Date(m.createdAt), "HH:mm", { locale: ru })}</span>
                      {isOutgoing && <CheckCheck className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Actions Area */}
      <div className="p-3 border-t bg-background shrink-0 flex items-center gap-2 relative">
        {/* Quick Replies Dropdown Icon */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-foreground shrink-0" title="Быстрые ответы / Шаблоны">
              <FileText className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2 space-y-1 text-xs">
            <div className="font-semibold text-xs text-slate-700 dark:text-slate-200 px-2 py-1 border-b mb-1 flex items-center justify-between">
              <span>Быстрые ответы / Шаблоны</span>
            </div>
            {QUICK_REPLIES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(tmpl.text)}
                className="w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">{tmpl.title}</p>
                <p className="text-slate-500 text-[11px] truncate mt-0.5">{tmpl.text}</p>
              </button>
            ))}
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
          <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
            <span className="text-xs font-semibold text-red-700">Запись... {formatDuration(recordingSeconds)}</span>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100 shrink-0" onClick={cancelRecording} title="Отмена">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs shrink-0" onClick={stopAndSendRecording}>
              <Send className="h-3.5 w-3.5 mr-1" />Отправить
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Напишите сообщение (Enter — отправить)…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 min-h-[42px] max-h-32 text-xs resize-none py-2.5 px-3 rounded-xl border-slate-200"
              rows={1}
            />

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 text-slate-600 hover:text-red-600 hover:border-red-200 shrink-0 rounded-xl"
              onClick={startRecording}
              title="Записать голосовое сообщение"
            >
              <Mic className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={sending || !inputText.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl bg-[#144d37] hover:bg-[#0e3827] text-white shrink-0 shadow-xs"
            >
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </>
        )}

        {/* Forward Message Modal */}
        <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <CornerUpRight className="h-4 w-4 text-primary" />
                Переслать сообщение
              </DialogTitle>
            </DialogHeader>
            {forwardingMsg && (
              <div className="space-y-3 pt-1">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs italic text-slate-700 dark:text-slate-300 border">
                  "{forwardingMsg.text || "Медиафайл"}"
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Поиск получателя (по имени или номеру):
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Введите имя или номер телефона…"
                      value={forwardSearch}
                      onChange={(e) => setForwardSearch(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                </div>

                {/* Filtered list of contacts / chats */}
                <div className="max-h-56 overflow-y-auto divide-y border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  {filteredForwardTargets.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {forwardSearch ? "Контакты не найдены" : "Список контактов пуст"}
                    </div>
                  ) : (
                    filteredForwardTargets.map((c: ConversationListItemDto) => {
                      const name = clientDisplayName(c.client);
                      const phonePretty = formatPhonePretty(c.client?.phone || c.id);
                      const cleanPhone = (c.client?.phone || c.id).replace(/\D/g, "");

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleForwardMessage(cleanPhone)}
                          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={name} className="h-7 w-7 text-[10px]" />
                            <div className="truncate">
                              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{phonePretty}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs shrink-0">
                            Отправить
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Manual number send button fallback */}
                {forwardSearch.replace(/\D/g, "").length >= 5 && (
                  <Button
                    size="sm"
                    className="w-full text-xs gap-1.5 bg-primary hover:bg-primary/90 mt-1"
                    onClick={() => handleForwardMessage(forwardSearch.replace(/\D/g, ""))}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Отправить на номер {formatPhonePretty(forwardSearch)}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Context Menu (Right Click) */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 text-xs w-44 animate-in fade-in zoom-in-95"
            style={{
              top: Math.min(contextMenu.y, typeof window !== "undefined" ? window.innerHeight - 150 : contextMenu.y),
              left: Math.min(contextMenu.x, typeof window !== "undefined" ? window.innerWidth - 190 : contextMenu.x),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.message.direction === "OUTGOING" && (
              <button
                onClick={() => {
                  setEditingMsg(contextMenu.message);
                  setEditText(contextMenu.message.text || "");
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                Редактировать
              </button>
            )}

            <button
              onClick={() => {
                setForwardingMsg(contextMenu.message);
                setForwardModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <CornerUpRight className="h-3.5 w-3.5 text-slate-500" />
              Переслать
            </button>
          </div>
        )}

        {/* Edit Message Modal */}
        <Dialog open={!!editingMsg} onOpenChange={(v) => !v && setEditingMsg(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Редактировать сообщение
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
                rows={4}
                className="text-xs resize-none"
                placeholder="Введите новый текст сообщения…"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setEditingMsg(null)}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  disabled={savingEdit || !editText.trim()}
                  onClick={handleSaveEdit}
                >
                  {savingEdit ? "Сохранение…" : "Сохранить"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
