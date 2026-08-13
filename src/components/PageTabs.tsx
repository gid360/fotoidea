"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
}

export function PageTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b bg-background px-4 shrink-0">
      {tabs.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
