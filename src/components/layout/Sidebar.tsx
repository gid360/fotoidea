"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Wallet,
  BarChart3, Settings, LogOut, Plus, Camera,
  ShoppingBag, MessageCircle, Percent, ChevronLeft, ChevronRight,
} from "lucide-react";
import { UserRole } from "@prisma/client";

const nav = [
  { label: "Главная",        href: "/dashboard",        icon: LayoutDashboard },
  { label: "Сообщения",     href: "/conversations",    icon: MessageCircle, adminOnly: true },
  { label: "Расписание",     href: "/schedule",         icon: CalendarDays, createHref: "/schedule?new=1" },
  { label: "Клиенты",        href: "/clients",          icon: Users, createHref: "/clients?new=1" },
  { label: "Воронка продаж", href: "/crm",              icon: ShoppingBag },
  { label: "Услуги",           href: "/subscriptions/plans", icon: Camera },
  { label: "Касса",          href: "/cashbox/transactions", icon: Wallet },
  { label: "Аналитика",      href: "/analytics",        icon: BarChart3, superadminOnly: true },
  { label: "Настройки",     href: "/settings/halls",   icon: Settings, superadminOnly: true },
];

interface NavItemDef {
  label: string;
  href?: string;
  icon: React.ElementType;
  createHref?: string;
  adminOnly?: boolean;
  superadminOnly?: boolean;
  children?: { label: string; href: string; icon: React.ElementType }[];
}

function isExactOrChild(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const pathname = usePathname();
  const isGroupActive = item.children?.some((c) => isExactOrChild(pathname, c.href))
    || (item.label === "Настройки" && pathname.startsWith("/salary"));

  // Простая ссылка (без детей)
  if (item.href) {
    // For /subscriptions/plans and /cashbox/transactions treat the whole section as active
    const sectionRoot = item.href === "/subscriptions/plans" ? "/subscriptions"
      : item.href.startsWith("/cashbox") ? "/cashbox"
      : null;
    const isActive = pathname === item.href ||
      (item.href !== "/dashboard" && isExactOrChild(pathname, item.href)) ||
      (sectionRoot !== null && isExactOrChild(pathname, sectionRoot)) ||
      (item.href === "/subscriptions/plans" && pathname.startsWith("/certificates")) ||
      (item.href === "/settings/halls" && pathname.startsWith("/settings"));
    const baseClass = cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
    );

    if (!collapsed && item.createHref) {
      return (
        <div className="flex items-center">
          <Link href={item.href} className={cn(baseClass, "flex-1")}>
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
          <Link href={item.createHref} title="Создать"
            className="mr-2 p-1 rounded text-sidebar-foreground/40 hover:text-white hover:bg-sidebar-accent/40 transition-colors shrink-0">
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      );
    }

    return (
      <Link href={item.href} title={collapsed ? item.label : undefined}
        className={cn(baseClass, collapsed ? "justify-center" : "")}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && item.label}
      </Link>
    );
  }

  // Группа с дочерними пунктами
  if (collapsed) {
    // В свёрнутом виде — flyout при hover
    return (
      <div className="group relative">
        <button title={item.label}
          className={cn(
            "w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isGroupActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
          )}>
          <item.icon className="h-4 w-4" />
        </button>
        <div className="absolute left-full top-0 hidden group-hover:block z-50 ml-1">
          <div className="w-52 bg-sidebar border border-sidebar-border rounded-md shadow-xl py-1">
            <p className="px-3 py-1 text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wide">{item.label}</p>
            {item.children?.map((child) => {
              const isActive = isExactOrChild(pathname, child.href);
              return (
                <Link key={child.href} href={child.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
                  )}>
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Развёрнутый вид — inline-раскрытие, всегда видны дети когда группа активна
  return (
    <div>
      {/* Заголовок группы */}
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
        isGroupActive ? "text-white/80" : "text-sidebar-foreground/50"
      )}>
        <item.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.createHref && (
          <Link href={item.createHref} title="Добавить"
            className="p-0.5 rounded text-sidebar-foreground/40 hover:text-white hover:bg-sidebar-accent/40 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {/* Дочерние пункты — всегда видны */}
      <div className="ml-2 pl-3 border-l border-sidebar-foreground/10 space-y-0.5 mb-1">
        {item.children?.map((child) => {
          const isActive = isExactOrChild(pathname, child.href);
          return (
            <Link key={child.href} href={child.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
              )}>
              <child.icon className="h-3.5 w-3.5 shrink-0" />
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  });
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const sessionReady = status !== "loading";

  const visibleNav = nav.filter((item) => {
    if (role === UserRole.PHOTOGRAPHER) {
      return item.href === "/schedule" || item.href === "/dashboard";
    }
    if (item.superadminOnly) return role === UserRole.SUPERADMIN;
    if (item.adminOnly) return role === UserRole.SUPERADMIN || role === UserRole.ADMIN;
    return true;
  });

  const roleLabel =
    role === UserRole.SUPERADMIN ? "Владелец" :
    role === UserRole.ADMIN ? "Администратор" :
    role === UserRole.PHOTOGRAPHER ? "Фотограф" :
    role === UserRole.TRAINER ? "Тренер" : "";

  const logoUrl = settings.logoUrl || "/logo.svg";

  return (
    <aside className={cn(
      "h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
      collapsed ? "w-14" : "w-60"
    )}>
      <div className="px-3 py-3.5 border-b border-sidebar-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={logoUrl} alt="Логотип Fotoidea"
                className="h-8 w-8 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">
                  {settings.studioName || "Fotoidea"}
                </p>
                <p className="text-xs text-sidebar-foreground truncate">CRM система</p>
              </div>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Свернуть меню"
                className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/60 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img src={logoUrl} alt="Логотип Fotoidea"
              className="h-7 w-7 object-contain shrink-0" />
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Развернуть меню"
                className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/60 transition-colors shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!sessionReady ? (
          <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cn("h-9 rounded-md bg-sidebar-accent/20 animate-pulse",
                collapsed ? "w-9 mx-auto" : "w-full")} />
            ))}
          </div>
        ) : (
          visibleNav.map((item) => (
            <NavItem key={item.label} item={item as NavItemDef} collapsed={collapsed} />
          ))
        )}
      </nav>

      <div className="mt-auto px-2 py-3 border-t border-sidebar-border shrink-0 bg-sidebar">
        {session?.user && (
          <div className={cn("flex items-center gap-2 mb-2", collapsed ? "justify-center" : "px-1")}>
            <div className="h-7 w-7 shrink-0 rounded-full bg-sidebar-accent/60 flex items-center justify-center text-white text-xs font-bold">
              {session.user.name?.[0] ?? "?"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{roleLabel}</p>
              </div>
            )}
          </div>
        )}
        <button
          title={collapsed ? "Выйти" : undefined}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-white transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && "Выйти"}
        </button>
      </div>
    </aside>
  );
}
