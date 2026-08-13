"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/widget") || pathname.startsWith("/book");
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
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="relative shrink-0 bg-sidebar h-screen print-hide hidden md:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggle} />
      </div>

      {/* Mobile sidebar drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-sidebar h-screen print-hide
        transform transition-transform duration-200 ease-in-out
        md:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar collapsed={false} />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 h-7 w-7 rounded-full bg-sidebar-accent/60 flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center h-12 px-3 bg-sidebar border-b border-sidebar-border md:hidden print-hide">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-8 w-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-white">Fotoidea</span>
        </div>
        {children}
      </main>
    </div>
  );
}
