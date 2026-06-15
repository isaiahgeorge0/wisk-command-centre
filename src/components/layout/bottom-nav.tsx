"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  ChevronUp,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  isChildNavActive,
  isGroupActive,
  NAV_GROUPS,
  type NavGroup,
} from "@/lib/navigation";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  TrendingUp,
  Sparkles,
};

function MobileNavSheet({
  group,
  pathname,
  onClose,
  reduced,
}: {
  group: NavGroup;
  pathname: string;
  onClose: () => void;
  reduced: boolean | null;
}) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Close navigation menu"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.normal }}
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-label={`${group.label} navigation`}
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: "100%" }}
        transition={{
          duration: reduced ? 0 : MOTION_DURATION.normal,
          ease: MOTION_EASE.smooth,
        }}
        className="fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border-t border-border/60 bg-card px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl"
      >
        <div
          className="mx-auto mb-4 h-1 w-8 rounded-full bg-muted-foreground/30"
          aria-hidden
        />
        <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {group.label}
        </h2>
        <ul className="space-y-1">
          {group.children!.map((child) => {
            const active = isChildNavActive(
              pathname,
              child,
              group.children!
            );
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[52px] w-full items-center rounded-lg px-4 text-base font-medium transition-colors hover:bg-muted/50",
                    active
                      ? "border-l-2 border-wisk-teal pl-[14px] text-wisk-teal"
                      : "border-l-2 border-transparent text-foreground"
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [sheetGroup, setSheetGroup] = useState<NavGroup | null>(null);

  const closeSheet = useCallback(() => setSheetGroup(null), []);

  useEffect(() => {
    setSheetGroup(null);
  }, [pathname]);

  const handleGroupTap = (group: NavGroup) => {
    const hasChildren = Boolean(group.children?.length);

    if (!hasChildren) {
      router.push(group.href);
      return;
    }

    const active = isGroupActive(pathname, group);

    if (active) {
      setSheetGroup(group);
    } else {
      router.push(group.href);
    }
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-surface/90 backdrop-blur-md md:hidden"
        aria-label="Main navigation"
      >
        <div
          className="mx-auto flex max-w-7xl items-stretch justify-around px-1 pt-1"
          style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
        >
          {NAV_GROUPS.map((group) => {
            const active = isGroupActive(pathname, group);
            const hasChildren = Boolean(group.children?.length);
            const showSubNavHint = active && hasChildren;
            const Icon = GROUP_ICONS[group.icon];
            const childLabels = group.children?.map((child) => child.label) ?? [];
            const tooltipTitle = hasChildren
              ? active
                ? `Tap to see ${childLabels.join(", ")}`
                : `Go to ${group.label}`
              : undefined;

            return (
              <button
                key={group.label}
                type="button"
                title={tooltipTitle}
                onClick={() => handleGroupTap(group)}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all duration-100 active:scale-95 active:opacity-70",
                  active
                    ? "text-wisk-teal"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative flex flex-col items-center">
                  {showSubNavHint ? (
                    <motion.span
                      className="mb-0.5 flex items-center justify-center text-wisk-teal"
                      animate={reduced ? undefined : { y: [-2, 0] }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : {
                              duration: 1,
                              repeat: Infinity,
                              repeatType: "mirror",
                              ease: "easeInOut",
                            }
                      }
                    >
                      <ChevronUp className="size-3" aria-hidden />
                    </motion.span>
                  ) : null}
                  <Icon className="size-5 shrink-0" aria-hidden />
                </div>
                <span className="truncate leading-tight">
                  {showSubNavHint ? `${group.label} ›` : group.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {sheetGroup ? (
          <MobileNavSheet
            group={sheetGroup}
            pathname={pathname}
            onClose={closeSheet}
            reduced={reduced}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
