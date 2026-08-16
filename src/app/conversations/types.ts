export interface FunnelStageDto {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface FunnelDto {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  stages: FunnelStageDto[];
}

export interface UpcomingBookingDto {
  id: string;
  startAt: string;
  directionName: string;
  status: string;
}

export interface ClientDto {
  id: string;
  dbClientId?: string | null;
  phone: string;
  name: string | null;
  segment: "NEW" | "ACTIVE" | "REGULAR" | "LOST" | "FORMER";
  lastVisitAt: string | null;
  channel: "WHATSAPP" | "INSTAGRAM" | "WIDGET" | "";
  avatarUrl: string | null;
  instagramUsername?: string | null;
  source: string;
  note: string | null;
  visitedCount?: number;
  upcomingBookings?: UpcomingBookingDto[];
}

export interface MessageDto {
  id: string;
  conversationId: string;
  direction: "INCOMING" | "OUTGOING";
  text: string | null;
  mediaUrl: string | null;
  mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | null;
  fileName: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  createdAt: string;
  isEdited?: boolean;
  reactions?: string[] | null;
  author: { id: string; name: string } | null;
  replyToMessage?: {
    id: string;
    text: string | null;
  } | null;
}

export interface NoteDto {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string };
}

export interface ConversationListItemDto {
  id: string;
  clientId: string;
  remoteJid: string;
  funnelStageId: string;
  assignedAdminId: string | null;
  status: "OPEN" | "CLOSED";
  lastMessageAt: string | null;
  unreadCount?: number;
  isPinned?: boolean;
  client: ClientDto;
  funnelStage: FunnelStageDto;
  assignedAdmin: { id: string; name: string } | null;
  messages: MessageDto[];
}

export interface ConversationDetailDto extends Omit<ConversationListItemDto, "messages"> {
  client: ClientDto;
  notes: NoteDto[];
  messages: MessageDto[];
}

export const SEGMENT_LABEL: Record<string, string> = {
  NEW: "Новый",
  ACTIVE: "Действующий",
  REGULAR: "Постоянный",
  LOST: "Потерянный",
  FORMER: "Потерянный",
};

export const SEGMENT_COLOR: Record<string, string> = {
  NEW: "#2563eb",
  ACTIVE: "#059669",
  REGULAR: "#7c3aed",
  LOST: "#dc2626",
  FORMER: "#dc2626",
};

export function formatPhonePretty(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (!cleaned) return phone.replace(/[()\-]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length > 12) return "";
  if (cleaned.length === 11) {
    const first = cleaned.startsWith("7") || cleaned.startsWith("8") ? (cleaned.startsWith("7") ? "+7" : "8") : cleaned[0];
    return `${first} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  if (cleaned.length === 10) {
    return `8 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("7")) {
    return `+7 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone.replace(/[()\-]/g, " ").replace(/\s+/g, " ").trim();
}

export function clientDisplayName(client: Pick<ClientDto, "name" | "phone">): string {
  if (client.name && client.name !== client.phone && !client.name.includes("@lid")) {
    return client.name;
  }
  return formatPhonePretty(client.phone) || "Клиент";
}
