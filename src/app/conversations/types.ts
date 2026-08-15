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
  phone: string;
  name: string | null;
  segment: "NEW" | "ACTIVE" | "FORMER";
  lastVisitAt: string | null;
  channel: "WHATSAPP" | "INSTAGRAM" | "WIDGET" | "";
  avatarUrl: string | null;
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

export const SEGMENT_LABEL: Record<ClientDto["segment"], string> = {
  NEW: "Новый",
  ACTIVE: "Действующий",
  FORMER: "Бывший",
};

export const SEGMENT_COLOR: Record<ClientDto["segment"], string> = {
  NEW: "#94a3b8",
  ACTIVE: "#144d37",
  FORMER: "#eab308",
};

export function formatPhonePretty(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length > 12) return "";
  if (cleaned.length === 11 && (cleaned.startsWith("7") || cleaned.startsWith("8"))) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  }
  if (cleaned.length === 10) {
    return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 10)}`;
  }
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export function clientDisplayName(client: Pick<ClientDto, "name" | "phone">): string {
  if (client.name && client.name !== client.phone && !client.name.includes("@lid")) {
    return client.name;
  }
  return formatPhonePretty(client.phone) || "Клиент";
}
