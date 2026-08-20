"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { MobileSheetShell } from "@/components/layout/mobile-sheet-shell";
import { cn } from "@/lib/utils";

type SidebarNavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  items: SidebarNavItem[];
};

const RESEARCH_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Overview", href: "/research" }],
  },
  {
    label: "Watch",
    items: [
      { label: "Watchlist", href: "/research/watchlist" },
      { label: "Signals", href: "/research/signals" },
    ],
  },
  {
    label: "Analyse",
    items: [
      { label: "Win-rate", href: "/research/win-rate" },
      { label: "Lead Intelligence", href: "/research/leads" },
    ],
  },
  {
    label: "Ask",
    items: [{ label: "Ask Winston", href: "/research/chat" }],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/research") return pathname === "/research";
  return pathname.startsWith(href);
}

function NavLinkItem({
  item,
  active,
  onNavigate,
}: {
  item: SidebarNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-wisk-section-research/15 font-medium text-wisk-section-research"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-wisk-section-research">
          Research
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">
          Intelligence hub
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-6">
        {RESEARCH_NAV.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  active={isItemActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-2 pb-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          onClick={onNavigate}
        >
          ← Back to Overview
        </Link>
      </div>
    </div>
  );
}

export function ResearchSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open research navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-sm text-foreground shadow-sm md:hidden"
      >
        Menu
      </button>

      {mobileOpen ? (
        <MobileSheetShell
          onClose={() => setMobileOpen(false)}
          closeLabel="Close research navigation"
        >
          <SidebarContent
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </MobileSheetShell>
      ) : null}

      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border/60 md:bg-surface/90 md:backdrop-blur lg:w-72">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
