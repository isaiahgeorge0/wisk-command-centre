"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "@/lib/navigation";

type TopNavProps = {
  userEmail: string;
  userName: string | null;
};

export function TopNav({ userEmail, userName }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6 lg:gap-8 lg:px-8">
        <Link
          href="/"
          className="shrink-0 bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-lg font-bold tracking-[0.22em] text-transparent uppercase"
        >
          WISK
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto lg:gap-6">
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

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Link
            href="/settings"
            aria-label="Settings"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              (pathname === "/settings" || pathname.startsWith("/settings/")) &&
                "bg-muted/50 text-foreground"
            )}
          >
            <Settings className="size-4" />
          </Link>
          <UserMenu userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
