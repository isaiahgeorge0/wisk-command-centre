"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  AwaySummary,
  AwaySummaryItem,
} from "@/lib/away/build-away-summary";

type WhileYouWereAwayProps = {
  summary: AwaySummary | null;
  lastSyncedAt: string | null;
  lastActiveAt: string | null;
  canAccess: boolean;
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

function formatRelative(value: string | null, now: number): string {
  if (!value) return "just now";

  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(elapsed / (60 * 1000));
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;

  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function SummarySection({
  label,
  items,
}: {
  label: string;
  items: AwaySummaryItem[];
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2 py-1">
          <span className="size-1 shrink-0 rounded-full bg-[#8b00ff]/60" />
          <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
            {item.label}
          </span>
          {item.sub ? (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {item.sub}
            </span>
          ) : null}
        </div>
      ))}
      {items.length > 3 ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          +{items.length - 3} more
        </p>
      ) : null}
    </div>
  );
}

export function WhileYouWereAway({
  summary,
  lastSyncedAt,
  lastActiveAt,
  canAccess,
}: WhileYouWereAwayProps) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!canAccess) return;

    const lastSyncTime = lastSyncedAt
      ? new Date(lastSyncedAt).getTime()
      : Number.NaN;
    const isStale =
      !Number.isFinite(lastSyncTime) ||
      Date.now() - lastSyncTime > FIFTEEN_MINUTES;
    if (!isStale) return;

    const controller = new AbortController();
    void fetch("/api/away-sync/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sinceAt: lastActiveAt }),
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) router.refresh();
      })
      .catch(() => {});

    return () => controller.abort();
  }, [canAccess, lastActiveAt, lastSyncedAt, router]);

  if (!canAccess || now === null) return null;

  if (summary) {
    const lastActiveTime = lastActiveAt
      ? new Date(lastActiveAt).getTime()
      : Number.NaN;
    if (
      Number.isFinite(lastActiveTime) &&
      now - lastActiveTime < THIRTY_MINUTES
    ) {
      return null;
    }
  }

  const sections = summary
    ? [
        { label: "New emails", items: summary.newEmails },
        { label: "New leads", items: summary.newLeads },
        { label: "Now overdue", items: summary.overdueTasks },
        { label: "Tenant messages", items: summary.newMessages },
      ]
        .filter((section) => section.items.length > 0)
        .slice(0, 3)
    : [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-wisk-section-winston/20 bg-card/60 p-5">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[#8b00ff]" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#8b00ff]/10">
            <Sparkles className="size-4 text-[#8b00ff]" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            While you were away
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelative(lastActiveAt, now)}
        </span>
      </div>

      {!summary ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 size-6 animate-spin rounded-full border-2 border-[#8b00ff]/20 border-t-[#8b00ff]" />
          <p className="text-sm text-muted-foreground">
            Getting your updates...
          </p>
        </div>
      ) : !summary.hasUpdates ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 text-2xl">👀</div>
          <p className="text-sm font-medium text-foreground">
            Nothing to catch up on
          </p>
          <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
            Everything&apos;s quiet. We&apos;ll flag anything important as soon
            as it comes in.
          </p>
        </div>
      ) : (
        <>
          {sections.map((section) => (
            <SummarySection
              key={section.label}
              label={section.label}
              items={section.items}
            />
          ))}
          <p className="mt-4 text-[10px] text-muted-foreground">
            Last updated {formatRelative(lastSyncedAt, now)}
          </p>
        </>
      )}
    </div>
  );
}
