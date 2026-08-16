"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, RefreshCw, Pin, MessageCircle, Filter, Plus, UserPlus, CheckCheck, X, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { ChannelBadge } from "./ChannelBadge";
import { ChatPanel } from "./ChatPanel";
import { ClientPanel } from "./ClientPanel";
import type {
  ConversationListItemDto,
  ConversationDetailDto,
  FunnelStageDto,
} from "./types";
import { SEGMENT_COLOR, SEGMENT_LABEL, clientDisplayName, formatPhonePretty } from "./types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type ChannelFilter = "ALL" | "WHATSAPP" | "INSTAGRAM";

export function ConversationsClient() {
  const qc = useQueryClient();
  const [selectedId, setSelectedIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paramId = urlParams.get("id");
      if (paramId) return paramId;
      const stored = localStorage.getItem("fotoidea_selected_conversation_id");
      if (stored) return stored;
    }
    return null;
  });

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("fotoidea_selected_conversation_id", id);
        const url = new URL(window.location.href);
        url.searchParams.set("id", id);
        window.history.replaceState({}, "", url.toString());
      } else {
        localStorage.removeItem("fotoidea_selected_conversation_id");
      }
    }
  }, []);

  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");
  const [showClientPanel, setShowClientPanel] = useState(true);

  // Pinned conversations stored in localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fotoidea_pinned_conversations");
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
    }
    return [];
  });

  const togglePin = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("fotoidea_pinned_conversations", JSON.stringify(next));
      return next;
    });
  }, []);

  // Fetch funnel stages for status column
  const { data: funnelStages = [] } = useQuery<FunnelStageDto[]>({
    queryKey: ["funnel-stages"],
    queryFn: () =>
      fetch("/api/settings/crm-stages")
        .then((r) => r.json())
        .then((stages) =>
          stages.map((s: any) => ({
            id: s.status,
            name: s.label,
            order: s.order,
            color: s.color,
          }))
        )
        .catch(() => []),
  });

  // Fetch conversations list with local cache for instant initial display
  const { data: conversations = [], isLoading: loading, isFetching, refetch: refetchConversations } = useQuery<ConversationListItemDto[]>({
    queryKey: ["conversations-list"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("fotoidea_cached_conversations", JSON.stringify(data));
        } catch {}
      }
      return data;
    },
    initialData: () => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("fotoidea_cached_conversations");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {}
      }
      return undefined;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    refetchInterval: 8000,
    retry: 2,
  });

  // Highlight chats for 1.5 seconds when new incoming messages arrive
  const [highlightedChats, setHighlightedChats] = useState<Record<string, boolean>>({});
  const prevConvsRef = useRef<Record<string, { lastMessageAt?: string | null; text?: string | null }>>({});

  useEffect(() => {
    if (!conversations.length) return;

    const newHighlights: string[] = [];
    conversations.forEach((c) => {
      const prev = prevConvsRef.current[c.id];
      const lastMsg = c.messages?.[0];
      if (prev && (prev.lastMessageAt !== c.lastMessageAt || prev.text !== lastMsg?.text)) {
        if (lastMsg?.direction !== "OUTGOING") {
          newHighlights.push(c.id);
        }
      }
      prevConvsRef.current[c.id] = { lastMessageAt: c.lastMessageAt, text: lastMsg?.text };
    });

    if (newHighlights.length > 0) {
      setHighlightedChats((prev) => {
        const next = { ...prev };
        newHighlights.forEach((id) => { next[id] = true; });
        return next;
      });

      setTimeout(() => {
        setHighlightedChats((prev) => {
          const next = { ...prev };
          newHighlights.forEach((id) => { delete next[id]; });
          return next;
        });
      }, 1500);
    }
  }, [conversations]);

  // Auto-select first conversation if none selected and sync ID
  const activeSelectedId = selectedId || (conversations.length > 0 ? conversations[0].id : null);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, setSelectedId]);
  const selectedListItem = useMemo(() => conversations.find((c) => c.id === activeSelectedId), [conversations, activeSelectedId]);

  // Hover prefetching helper
  const prefetchConversation = useCallback((id: string) => {
    qc.prefetchQuery({
      queryKey: ["conversation-detail", id],
      queryFn: () => fetch(`/api/conversations/${encodeURIComponent(id)}`).then((r) => r.json()),
      staleTime: 1000 * 60 * 3,
    });
  }, [qc]);

  // Fetch detail for selected conversation
  const { data: detail, refetch: refetchDetail, isLoading: isDetailLoading } = useQuery<ConversationDetailDto>({
    queryKey: ["conversation-detail", activeSelectedId],
    queryFn: () => fetch(`/api/conversations/${encodeURIComponent(activeSelectedId!)}`).then((r) => r.json()),
    enabled: !!activeSelectedId,
    staleTime: 2000,
    refetchInterval: 6000,
  });

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter !== "ALL" && c.client.channel !== channelFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const nameMatch = c.client.name?.toLowerCase().includes(query);
        const phoneMatch = c.client.phone?.includes(query);
        const msgMatch = c.messages?.[0]?.text?.toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch && !msgMatch) return false;
      }
      return true;
    });
  }, [conversations, channelFilter, search]);

  // Sort pinned conversations to top (both from WhatsApp API and local pins)
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) || Boolean(a.isPinned);
      const bPinned = pinnedIds.includes(b.id) || Boolean(b.isPinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });
  }, [filteredConversations, pinnedIds]);

  // Mark conversation as read whenever activeSelectedId is selected
  useEffect(() => {
    if (!activeSelectedId) return;

    // Immediately clear unreadCount locally
    qc.setQueryData<ConversationListItemDto[]>(["conversations"], (old) => {
      if (!old) return old;
      return old.map((c) => (c.id === activeSelectedId ? { ...c, unreadCount: 0 } : c));
    });

    // Send read request to server / Evolution API
    fetch(`/api/conversations/${encodeURIComponent(activeSelectedId)}/read`, {
      method: "POST",
    }).catch((err) => console.error("Error marking chat read:", err));
  }, [activeSelectedId, qc]);

  const handleMarkAllRead = async () => {
    try {
      qc.setQueryData<ConversationListItemDto[]>(["conversations"], (old) => {
        if (!old) return old;
        return old.map((c) => ({ ...c, unreadCount: 0 }));
      });
      await fetch("/api/whatsapp/chats/read-all", { method: "POST" });
      refetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshAll = () => {
    refetchConversations();
    if (activeSelectedId) refetchDetail();
  };

  const [visibleDialogsCount, setVisibleDialogsCount] = useState(15);

  useEffect(() => {
    setVisibleDialogsCount(15);
  }, [search, channelFilter]);

  const displayedConversations = useMemo(() => {
    if (search.trim()) {
      return sortedConversations;
    }
    return sortedConversations.slice(0, visibleDialogsCount);
  }, [sortedConversations, visibleDialogsCount, search]);

  const handleDialogsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (visibleDialogsCount < sortedConversations.length) {
        setVisibleDialogsCount((prev) => Math.min(prev + 15, sortedConversations.length));
      }
    }
  };

  const [mobileView, setMobileView] = useState<"list" | "chat" | "client">("list");

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* COLUMN 1: LEFT CONVERSATIONS LIST */}
      <div
        className={cn(
          "w-full md:w-80 border-r flex flex-col bg-background shrink-0 min-h-0",
          mobileView !== "list" ? "hidden md:flex" : "flex"
        )}
      >
        {/* Header & Filter Bar */}
        <div className="p-3 border-b space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Сообщения
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMarkAllRead}
                title="Отметить все прочитанными"
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={handleRefreshAll}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Поиск по клиенту или номеру…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title="Очистить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Channel Filters */}
          <div className="flex gap-1 pt-1">
            {(["ALL", "WHATSAPP", "INSTAGRAM"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex-1 text-center",
                  channelFilter === ch
                    ? "bg-primary text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {ch === "ALL" ? "Все" : ch === "WHATSAPP" ? "WhatsApp" : "Instagram"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List Items */}
        <div
          onScroll={handleDialogsScroll}
          className="flex-1 overflow-y-auto divide-y min-h-0"
        >
          {conversations.length === 0 && (loading || isFetching) ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Загрузка диалогов…
            </div>
          ) : displayedConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {search.trim() || channelFilter !== "ALL" ? (
                "Диалоги не найдены"
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary" />
                  <span>Загрузка диалогов…</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {displayedConversations.map((c) => {
                const isSelected = activeSelectedId === c.id;
                const isPinned = pinnedIds.includes(c.id) || Boolean(c.isPinned);
                const isHighlighted = !!highlightedChats[c.id];
                const lastMsg = c.messages?.[0];

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setMobileView("chat");
                    }}
                    onMouseEnter={() => prefetchConversation(c.id)}
                    className={cn(
                      "p-3 cursor-pointer flex items-start gap-3 transition-all duration-500 relative group overflow-hidden",
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
                    <div className="relative shrink-0">
                      <Avatar src={c.client.avatarUrl} name={clientDisplayName(c.client)} size="md" />
                      <ChannelBadge channel={c.client.channel} className="absolute -bottom-1 -right-1" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs truncate text-slate-900 flex items-center gap-1">
                            <span className="truncate">{clientDisplayName(c.client)}</span>
                            {(c.client.dbClientId || (c.client.id && !c.client.id.includes("@"))) && (
                              <span title="Клиент сохранён в базе данных" className="inline-flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </span>
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: SEGMENT_COLOR[c.client.segment] || "#94a3b8" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {c.lastMessageAt ? format(new Date(c.lastMessageAt), "HH:mm", { locale: ru }) : ""}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lastMsg?.direction === "OUTGOING" && (
                          <span className="text-green-600 font-medium mr-1">Вы:</span>
                        )}
                        {lastMsg?.text || "Диалог"}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (c.client.dbClientId || (c.client.id && !c.client.id.includes("@"))) {
                              window.open(`/clients/${c.client.dbClientId || c.client.id}`, "_blank");
                            } else if (c.client.phone) {
                              window.open(`/clients?search=${encodeURIComponent(c.client.phone.slice(-10))}`, "_blank");
                            }
                          }}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 hover:underline font-mono cursor-pointer transition-colors"
                          title="Открыть карточку клиента в базе"
                        >
                          {c.client.name && c.client.name !== c.client.phone && c.client.name !== formatPhonePretty(c.client.phone)
                            ? formatPhonePretty(c.client.phone)
                            : ""}
                        </span>

                        <div className="flex items-center gap-1">
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded-full font-medium"
                            style={{
                              backgroundColor: (SEGMENT_COLOR[c.client.segment] || "#2563eb") + "20",
                              color: SEGMENT_COLOR[c.client.segment] || "#2563eb",
                            }}
                          >
                            {SEGMENT_LABEL[c.client.segment] || "Новый"}
                          </span>

                          <button
                            onClick={(e) => togglePin(c.id, e)}
                            className={cn(
                              "p-0.5 rounded hover:bg-slate-200 transition-opacity",
                              isPinned ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100 text-slate-400"
                            )}
                          >
                            <Pin className="h-3 w-3 fill-current" />
                          </button>

                          {(c.unreadCount ?? 0) > 0 && (
                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full">
                              {c.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleDialogsCount < sortedConversations.length && !search.trim() && (
                <div className="p-3 text-center bg-slate-50/50">
                  <div className="text-xs text-muted-foreground italic">Прокрутите для загрузки еще...</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* COLUMN 2: CENTER CHAT PANEL */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 h-full",
          mobileView !== "chat" ? "hidden md:flex" : "flex"
        )}
      >
        {detail && (detail.id === activeSelectedId || decodeURIComponent(detail.id) === decodeURIComponent(activeSelectedId || "")) ? (
          <ChatPanel
            conversation={detail}
            onRefresh={refetchDetail}
            onBack={() => setMobileView("list")}
            onOpenClientPanel={() => {
              setShowClientPanel(true);
              setMobileView("client");
            }}
          />
        ) : activeSelectedId && isDetailLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-slate-50">
            <RefreshCw className="h-7 w-7 animate-spin text-primary mb-2" />
            <p className="font-medium text-xs text-slate-600">Загрузка переписки…</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-slate-50">
            <MessageCircle className="h-12 w-12 text-slate-300 mb-2" />
            <p className="font-medium text-sm">Выберите диалог для просмотра сообщений</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: RIGHT CLIENT PANEL */}
      {detail && (detail.id === activeSelectedId || decodeURIComponent(detail.id) === decodeURIComponent(activeSelectedId || "")) && (
        <div
          className={cn(
            "h-full shrink-0",
            mobileView === "client" ? "flex w-full" : "hidden md:flex md:w-80"
          )}
        >
          <ClientPanel
            key={detail.id}
            conversation={detail}
            onChanged={handleRefreshAll}
            onBack={() => setMobileView("chat")}
            onClose={() => {
              setShowClientPanel(false);
              setMobileView("chat");
            }}
          />
        </div>
      )}
    </div>
  );
}
