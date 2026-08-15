"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  MessageCircle,
  Users,
  ShoppingBag,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

const bottomNavItems = [
  { label: "Расписание", href: "/schedule", icon: CalendarDays },
  { label: "Сообщения", href: "/conversations", icon: MessageCircle },
  { label: "Клиенты", href: "/clients", icon: Users },
  { label: "Воронка", href: "/crm", icon: ShoppingBag },
];

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Don't show bottom navigation on auth, booking widget, or public cert pages
  if (
    pathname === "/login" ||
    pathname.startsWith("/widget") ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/c/")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around h-14 px-1 md:hidden print-hide safe-area-pb">
      {bottomNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-all duration-200 active:scale-95",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-xl transition-all",
                isActive && "bg-primary/10"
              )}
            >
              <item.icon className="h-4 w-4" />
            </div>
            <span className="truncate mt-0.5 max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
      >
        <div className="p-1 rounded-xl">
          <Menu className="h-4 w-4" />
        </div>
        <span className="truncate mt-0.5">Меню</span>
      </button>
    </nav>
  );
}
