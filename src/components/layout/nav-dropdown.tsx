"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  FolderKanban,
  Lightbulb,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import {
  isDropdownGroupActive,
  isNavActive,
  type NavDropdownGroupConfig,
  type NavDropdownItem,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

const DROPDOWN_ICONS: Record<NavDropdownItem["icon"], LucideIcon> = {
  FolderKanban,
  CheckSquare,
  Target,
  Lightbulb,
  FileText,
  Calendar,
  TrendingUp,
  CalendarDays,
};

const CLOSE_DELAY_MS = 150;

type NavDropdownProps = {
  group: NavDropdownGroupConfig;
};

export function NavDropdown({ group }: NavDropdownProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = isDropdownGroupActive(pathname, group.items);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: rect.left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <div
      ref={triggerRef}
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center gap-1 px-0.5 py-1 text-sm font-medium transition-colors duration-300",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {group.label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
        {active ? (
          <motion.span
            layoutId={reduced ? undefined : "nav-underline"}
            className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-wisk-lime/80"
            transition={
              reduced
                ? { duration: 0 }
                : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
            }
          />
        ) : null}
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && position ? (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{ top: position.top, left: position.left }}
                  className="fixed z-[100] min-w-[260px] overflow-hidden rounded-lg border border-border/60 bg-surface/95 p-1 shadow-lg backdrop-blur-md"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {group.items.map((item) => {
                    const Icon = DROPDOWN_ICONS[item.icon];
                    const itemActive = isNavActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-200",
                          itemActive
                            ? "bg-muted/60 text-foreground"
                            : "text-foreground hover:bg-muted/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            itemActive ? "text-wisk-lime" : "text-muted-foreground"
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
