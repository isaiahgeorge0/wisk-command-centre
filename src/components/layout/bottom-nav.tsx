"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNavMode } from "@/components/layout/nav-mode-context";
import { PROPERTIES_MOBILE_NAV } from "@/components/properties/properties-sidebar";
import { isGroupActive, isNavActive, NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  TrendingUp,
  MessageSquare,
  Sparkles,
};

const PROPERTIES_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  Sparkles,
};

export function BottomNav() {
  const pathname = usePathname();
  const { navMode } = useNavMode();
  const showPropertiesNav =
    pathname.startsWith("/properties") || navMode === "properties";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-surface/90 backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <div
        className="mx-auto flex max-w-7xl items-stretch justify-around px-1 pt-1"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        {showPropertiesNav
          ? PROPERTIES_MOBILE_NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = PROPERTIES_ICONS[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all duration-100 active:scale-95 active:opacity-70",
                    active
                      ? "text-amber-500"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="truncate leading-tight">{item.label}</span>
                </Link>
              );
            })
          : NAV_GROUPS.map((group) => {
              const active = isGroupActive(pathname, group);
              const Icon = GROUP_ICONS[group.icon];

              return (
                <Link
                  key={group.label}
                  href={group.href}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all duration-100 active:scale-95 active:opacity-70",
                    active
                      ? "text-wisk-lime"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="truncate leading-tight">{group.label}</span>
                </Link>
              );
            })}
      </div>
    </nav>
  );
}
