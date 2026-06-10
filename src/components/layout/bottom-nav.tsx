"use client";

import {
  CheckSquare,
  Clapperboard,
  FolderKanban,
  Lightbulb,
  Target,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavActive, MOBILE_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ICONS = {
  "/projects": FolderKanban,
  "/tasks": CheckSquare,
  "/goals": Target,
  "/ideas": Lightbulb,
  "/content": Clapperboard,
  "/leads": UserPlus,
} as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-surface/90 backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <div
        className="mx-auto flex max-w-7xl items-stretch justify-around px-1 pt-1"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon =
            MOBILE_NAV_ICONS[item.href as keyof typeof MOBILE_NAV_ICONS];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all duration-100 active:scale-95 active:opacity-70",
                active
                  ? "text-wisk-teal"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="truncate leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
