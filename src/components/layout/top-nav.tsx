"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavDropdown } from "@/components/layout/nav-dropdown";
import { NavLink } from "@/components/layout/nav-link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WhatsNewButton } from "@/components/changelog/whats-new-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/notifications/types";
import type { ChangelogEntry } from "@/lib/changelog/types";
import {
  isNavActive,
  DESKTOP_DROPDOWN_GROUPS,
  DESKTOP_NAV_AFTER_DROPDOWNS,
  DESKTOP_NAV_OVERVIEW,
} from "@/lib/navigation";

type TopNavProps = {
  userEmail: string;
  userName: string | null;
  notifications: Notification[];
  unreadNotificationCount: number;
  changelogEntries: ChangelogEntry[];
  unreadChangelogCount: number;
  hasProperties: boolean;
};

export function TopNav({
  userEmail,
  userName,
  notifications,
  unreadNotificationCount,
  changelogEntries,
  unreadChangelogCount,
  hasProperties,
}: TopNavProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:gap-4 md:px-6 lg:gap-8 lg:px-8">
        <Link href="/" className="shrink-0 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wisk-logo-white.png"
            alt="WISK"
            className="h-7 w-auto dark:hidden"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(65%) sepia(40%) saturate(600%) hue-rotate(200deg) brightness(110%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wisk-logo-white.png"
            alt="WISK"
            className="h-7 w-auto hidden dark:block"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(93%) sepia(55%) saturate(900%) hue-rotate(33deg) brightness(105%)",
            }}
          />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-4 overflow-visible md:flex lg:gap-6">
          <NavLink
            href={DESKTOP_NAV_OVERVIEW.href}
            label={DESKTOP_NAV_OVERVIEW.label}
            active={isNavActive(pathname, DESKTOP_NAV_OVERVIEW.href)}
          />
          {DESKTOP_DROPDOWN_GROUPS.map((group) => (
            <NavDropdown key={group.label} group={group} />
          ))}
          {DESKTOP_NAV_AFTER_DROPDOWNS.filter(
            (item) =>
              !("requiresProperties" in item && item.requiresProperties) ||
              hasProperties
          ).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isNavActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
          <ThemeToggle />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotificationCount}
          />
          <WhatsNewButton
            entries={changelogEntries}
            unreadCount={unreadChangelogCount}
          />
          <motion.div
            whileHover={reduced ? undefined : { scale: 1.05 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
          >
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-300 hover:bg-muted/50 hover:text-foreground md:size-9",
                settingsActive && "bg-muted/50 text-foreground"
              )}
            >
              <Settings className="size-4" />
            </Link>
          </motion.div>
          <UserMenu userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
