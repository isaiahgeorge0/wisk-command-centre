"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "@/lib/navigation";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-lg font-bold tracking-[0.22em] text-transparent uppercase"
        >
          WISK
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground decoration-wisk-purple underline decoration-2 underline-offset-[10px]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
