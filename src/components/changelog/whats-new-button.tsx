"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { markChangelogSeen } from "@/app/(dashboard)/changelog/actions";
import { ChangelogPanel } from "@/components/changelog/changelog-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChangelogEntry } from "@/lib/changelog/types";

type WhatsNewButtonProps = {
  entries: ChangelogEntry[];
  unreadCount: number;
};

export function WhatsNewButton({ entries, unreadCount }: WhatsNewButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      startTransition(async () => {
        await markChangelogSeen();
        router.refresh();
      });
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-11 text-muted-foreground hover:text-foreground md:size-9"
            aria-label={
              unreadCount > 0
                ? `What's new, ${unreadCount} unread`
                : "What's new"
            }
          />
        }
      >
        <Sparkles className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-wisk-section-winston px-1 py-0.5 text-[10px] font-semibold text-white md:top-1 md:right-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border/60 px-4 py-2.5">
          <p className="text-sm font-medium text-foreground">What&apos;s new</p>
          <p className="text-xs text-muted-foreground">
            Recent updates to WISK Command Centre
          </p>
        </div>
        <ChangelogPanel entries={entries} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
