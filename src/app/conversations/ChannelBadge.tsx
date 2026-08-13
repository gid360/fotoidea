"use client";

import { MessageCircle, Instagram, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChannelBadge({
  channel,
  className,
}: {
  channel: "WHATSAPP" | "INSTAGRAM" | "WIDGET" | "" | undefined;
  className?: string;
}) {
  if (channel === "INSTAGRAM") {
    return (
      <span
        title="Instagram"
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shrink-0 shadow-sm",
          className
        )}
      >
        <Instagram className="h-3 w-3" />
      </span>
    );
  }

  if (channel === "WIDGET") {
    return (
      <span
        title="Виджет на сайте"
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white shrink-0 shadow-sm",
          className
        )}
      >
        <Globe className="h-3 w-3" />
      </span>
    );
  }

  // Default: WhatsApp
  return (
    <span
      title="WhatsApp"
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-500 text-white shrink-0 shadow-sm",
        className
      )}
    >
      <MessageCircle className="h-3 w-3 fill-current" />
    </span>
  );
}
