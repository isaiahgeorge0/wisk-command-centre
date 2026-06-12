"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

export type SectionSubNavItem = {
  label: string;
  href: string;
};

type SectionSubNavProps = {
  items: SectionSubNavItem[];
};

export function SectionSubNav({ items }: SectionSubNavProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;

  // Exact match first; fall back to prefix match for nested routes.
  const activeHref =
    items.find((item) => pathname === item.href)?.href ??
    items.find((item) => pathname.startsWith(item.href + "/"))?.href ??
    items[0]?.href;

  return (
    <nav
      aria-label="Section navigation"
      className="mb-6 overflow-x-auto scrollbar-hide"
    >
      <div className="flex min-w-max gap-0 border-b border-border/60">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative shrink-0 px-4 pb-3 pt-1 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {isActive ? (
                <motion.span
                  layoutId={reduced ? undefined : "sub-nav-underline"}
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-wisk-purple to-wisk-teal"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          duration: MOTION_DURATION.fast,
                          ease: MOTION_EASE.smooth,
                        }
                  }
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
