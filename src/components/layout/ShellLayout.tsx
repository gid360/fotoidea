"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Menu, X } from "lucide-react";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/widget") ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/c/");
  const isConversationsPage = pathname.startsWith("/conversations");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", String(!v));
      return !v;
    });
  }

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="relative shrink-0 bg-sidebar h-screen print-hide hidden md:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggle} />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 bg-sidebar h-screen print-hide w-72 max-w-[85vw]
        transform transition-transform duration-300 ease-in-out shadow-2xl
        md:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <Sidebar collapsed={false} />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3.5 right-3.5 h-8 w-8 rounded-full bg-sidebar-accent/80 flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Закрыть меню"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <main
        className={`flex-1 overflow-y-auto min-w-0 flex flex-col ${
          !isConversationsPage ? "pb-16 md:pb-0" : ""
        }`}
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-sidebar border-b border-sidebar-border md:hidden print-hide shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
              title="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white tracking-wide">
              Fotoidea CRM
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </main>

      {/* Mobile bottom navigation bar */}
      <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
    </div>
  );
}
