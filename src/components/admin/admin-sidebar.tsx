"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { MobileSheetShell } from "@/components/layout/mobile-sheet-shell";
import { cn } from "@/lib/utils";

type SidebarNavItem = {
  label: string;
  href: string;
  showBadge?: boolean;
};

type AdminSidebarProps = {
  newFeedbackCount: number;
};

const INSIGHTS_NAV: SidebarNavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Subscriptions", href: "/admin/subscriptions" },
  { label: "AI Usage", href: "/admin/ai-usage" },
  { label: "Properties", href: "/admin/properties" },
  { label: "Winston Engagement", href: "/admin/winston-engagement" },
  { label: "Integrations", href: "/admin/integrations" },
  { label: "Briefing Health", href: "/admin/briefing-health" },
  { label: "Platform Metrics", href: "/admin/platform-metrics" },
];

const CONTENT_NAV: SidebarNavItem[] = [
  { label: "Requests", href: "/admin/requests" },
  { label: "Users", href: "/admin/users" },
  { label: "Feedback", href: "/admin/feedback", showBadge: true },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Blog", href: "/admin/blog" },
  { label: "Changelog", href: "/admin/changelog" },
];

function isItemActive(pathname: string, href: string) {
  // Keep the “special-case exact match” behaviour for `/admin`.
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

function NavLinkItem({
  item,
  active,
  onNavigate,
  newFeedbackCount,
}: {
  item: SidebarNavItem;
  active: boolean;
  onNavigate?: () => void;
  newFeedbackCount: number;
}) {
  const showBadge = Boolean(item.showBadge && newFeedbackCount > 0);
  const badgeValue =
    newFeedbackCount > 99 ? "99+" : String(Math.max(0, newFeedbackCount));

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-muted/70 text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <span className="truncate">{item.label}</span>
      {showBadge ? (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badgeValue}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  newFeedbackCount,
}: {
  pathname: string;
  onNavigate?: () => void;
  newFeedbackCount: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">
          Command centre
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2 pb-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Insights
          </p>
          <div className="mt-2 space-y-1">
            {INSIGHTS_NAV.map((item) => (
              <NavLinkItem
                key={item.href}
                item={item}
                active={isItemActive(pathname, item.href)}
                onNavigate={onNavigate}
                newFeedbackCount={newFeedbackCount}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content & Support
          </p>
          <div className="mt-2 space-y-1">
            {CONTENT_NAV.map((item) => (
              <NavLinkItem
                key={item.href}
                item={item}
                active={isItemActive(pathname, item.href)}
                onNavigate={onNavigate}
                newFeedbackCount={newFeedbackCount}
              />
            ))}
          </div>
        </div>

        <div className="px-2 pt-2">
          <div className="mt-1 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Internal tools
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Read-only dashboards + operational access.
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 pb-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          onClick={onNavigate}
        >
          ← Back to WISK
        </Link>
      </div>
    </div>
  );
}

export function AdminSidebar({ newFeedbackCount }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open admin navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-sm text-foreground shadow-sm md:hidden"
      >
        Menu
      </button>

      {mobileOpen ? (
        <MobileSheetShell
          onClose={() => setMobileOpen(false)}
          closeLabel="Close admin navigation"
        >
          <SidebarContent
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            newFeedbackCount={newFeedbackCount}
          />
        </MobileSheetShell>
      ) : null}

      {/* Desktop / tablet */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-border/60 md:bg-surface/90 md:backdrop-blur">
        <SidebarContent
          pathname={pathname}
          newFeedbackCount={newFeedbackCount}
        />
      </aside>
    </>
  );
}

