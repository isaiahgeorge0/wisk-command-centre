"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  notifications: Notification[];
  unreadCount: number;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function BellButton({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-11 text-muted-foreground hover:text-foreground md:size-9"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      onClick={onClick}
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span
          className={cn(
            "absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-semibold leading-none text-white",
            unreadCount > 9 ? "min-w-[18px]" : "size-4"
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}

export function NotificationBell({
  notifications,
  unreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  if (isMobile) {
    return (
      <>
        <BellButton
          unreadCount={unreadCount}
          onClick={() => setOpen((current) => !current)}
        />
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 top-16 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-x-0 top-16 z-50 w-screen max-w-none overflow-hidden border-b border-border/60 bg-popover shadow-lg">
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                onClose={() => setOpen(false)}
              />
            </div>
          </>
        ) : null}
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-11 text-muted-foreground hover:text-foreground md:size-9"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span
            className={cn(
              "absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-semibold leading-none text-white",
              unreadCount > 9 ? "min-w-[18px]" : "size-4"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="!w-auto min-w-[320px] max-w-sm overflow-hidden rounded-lg p-0"
      >
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
