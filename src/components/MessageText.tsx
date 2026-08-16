"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MessageTextProps {
  text: string;
  isOutgoing?: boolean;
  className?: string;
}

// Regex to capture full URLs (http/https/www) and common domains (.kz, .ru, .com, .me, etc.)
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-zA-Z0-9-]+\.)+(?:kz|ru|com|org|net|io|me|ai|app|link|cc|to|online|space|site|kz)(?:\/[^\s<]*)?)/gi;

export function MessageText({ text, isOutgoing = false, className }: MessageTextProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        if (!part) return null;

        const isUrl = /^((https?:\/\/|www\.)|(?:[a-zA-Z0-9-]+\.)+(?:kz|ru|com|org|net|io|me|ai|app|link|cc|to|online|space|site))/i.test(part);

        if (isUrl) {
          let cleanedUrl = part;
          let trailingPunctuation = "";
          const matchPunct = part.match(/[.,!?;:)]+$/);
          if (matchPunct) {
            trailingPunctuation = matchPunct[0];
            cleanedUrl = part.slice(0, -trailingPunctuation.length);
          }

          let href = cleanedUrl;
          if (!href.startsWith("http://") && !href.startsWith("https://")) {
            href = `https://${href}`;
          }

          return (
            <React.Fragment key={index}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "underline font-medium break-all transition-opacity hover:opacity-85 cursor-pointer",
                  isOutgoing
                    ? "text-emerald-50 underline decoration-emerald-200 hover:text-white"
                    : "text-blue-600 dark:text-blue-400 underline decoration-blue-300 hover:text-blue-800"
                )}
              >
                {cleanedUrl}
              </a>
              {trailingPunctuation}
            </React.Fragment>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
