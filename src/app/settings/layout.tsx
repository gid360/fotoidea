"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Camera, UserCog, MessageCircle, Percent, Settings, Users, Link2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { label: "Залы", href: "/settings/halls", icon: LayoutDashboard },
  { label: "Категории услуг", href: "/settings/directions", icon: Camera },
  { label: "Быстрые ответы", href: "/settings/quick-replies", icon: FileText },
  { label: "Фотографы", href: "/settings/trainers", icon: UserCog },
  { label: "Пользователи", href: "/settings/users", icon: Users },
  { label: "Уведомления", href: "/settings/notifications", icon: MessageCircle },
  { label: "Скидки", href: "/settings/promo-codes", icon: Percent },
  { label: "Интеграции", href: "/settings/integrations", icon: Link2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-h-0 overflow-y-auto">
      {/* Settings Header & Tabs */}
      <div className="border-b bg-background px-6 pt-6 pb-0 shrink-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Настройки CRM</h1>
            <p className="text-xs text-muted-foreground">Управление параметрами студии, залами, интеграциями и доступом</p>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex gap-1 border-b border-slate-200/80 -mb-px overflow-x-auto">
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary bg-primary/5 rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-400")} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}
