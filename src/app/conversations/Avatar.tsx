"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
  }[size];

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover shrink-0 shadow-xs border border-slate-200/50", sizeClasses, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center shrink-0 shadow-xs border border-slate-200/50 select-none",
        sizeClasses,
        className
      )}
    >
      {initials || <User className="h-1/2 w-1/2 opacity-70" />}
    </div>
  );
}
