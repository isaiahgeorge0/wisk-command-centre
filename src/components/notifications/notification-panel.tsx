"use client";

import { BellOff, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  clearAllReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";
import { formatNotificationTime } from "@/lib/notifications/format";
import {
  NOTIFICATION_ACCENT_CLASS,
  NOTIFICATION_DOT_CLASS,
  isSuggestionNotificationType,
} from "@/lib/notifications/styles";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationPanelProps = {
  notifications: Notification[];
  unreadCount: number;
  onClose?: () => void;
};

export function NotificationPanel({
  notifications,
  unreadCount,
  onClose,
}: NotificationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasRead = notifications.some((n) => n.read);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  const handleClearRead = () => {
    startTransition(async () => {
      await clearAllReadNotifications();
      router.refresh();
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    startTransition(async () => {
      if (!notification.read) {
        await markNotificationRead(notification.id);
      }
      onClose?.();
      router.push(notification.link_to);
      router.refresh();
    });
  };

  return (
    <div className="flex w-full flex-col md:min-w-[320px]">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
        <p className="shrink-0 text-sm font-medium text-foreground">
          Notifications
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap px-2 text-xs"
              disabled={isPending}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          ) : null}
          {hasRead ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap px-2 text-xs text-muted-foreground"
              disabled={isPending}
              onClick={handleClearRead}
            >
              Clear read
            </Button>
          ) : null}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border/60">
            <BellOff className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            New alerts for overdue tasks, deadlines, and stalled work will
            appear here.
          </p>
        </div>
      ) : (
        <ul className="max-h-[min(20rem,calc(100dvh-8rem))] overflow-y-auto py-1 md:max-h-80">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full border-l-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/50",
                  notification.read
                    ? "border-l-transparent opacity-80"
                    : NOTIFICATION_ACCENT_CLASS[notification.type]
                )}
              >
                <div className="flex items-start gap-2">
                  {isSuggestionNotificationType(notification.type) ? (
                    <Sparkles
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        notification.read
                          ? "text-muted-foreground/50"
                          : "text-wisk-lime"
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.read
                          ? "bg-transparent"
                          : NOTIFICATION_DOT_CLASS[notification.type]
                      )}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground/80">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed break-words text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
