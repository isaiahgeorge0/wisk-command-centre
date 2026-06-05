"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { dismissAnnouncement } from "@/app/(dashboard)/admin/actions";
import type { ActiveAnnouncement } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnnouncementBannerProps = {
  announcements: ActiveAnnouncement[];
};

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const pathname = usePathname();
  const [queue, setQueue] = useState(announcements);
  const [isPending, startTransition] = useTransition();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }

  const current = queue[0];
  if (!current) {
    return null;
  }

  function handleDismiss() {
    const dismissedId = current!.id;
    setQueue((prev) => prev.slice(1));

    startTransition(async () => {
      await dismissAnnouncement(dismissedId);
    });
  }

  return (
    <div
      className={cn(
        "-mx-4 mb-4 border-b border-orange-500/20 bg-orange-500/8 md:-mx-6 lg:-mx-8",
        isPending && "opacity-80"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{current.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{current.message}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          disabled={isPending}
          aria-label="Dismiss announcement"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
