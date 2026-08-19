"use client";

import type { CSSProperties } from "react";
import { useMemo, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { refreshWinstonEngagementTrend } from "@/app/(dashboard)/admin/actions";
import type { WinstonEngagementPoint, WinstonEngagementTrend } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SCOPE_META = [
  { key: "note_id" as const, label: "Notes", dot: "bg-indigo-500/80" },
  { key: "scope_key" as const, label: "Section", dot: "bg-emerald-500/80" },
  { key: "general" as const, label: "Unscoped", dot: "bg-orange-500/70" },
];

type ScopeKey = typeof SCOPE_META[number]["key"];

function formatBucketLabel(bucketStart: string) {
  // bucketStart is ISO date string (YYYY-MM-DD)
  return new Date(`${bucketStart}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatPerActive(value: number | null) {
  if (value == null) return "N/A";
  return value.toFixed(2);
}

function stackedSegmentStyle(
  count: number,
  total: number
): CSSProperties {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return { width: `${pct}%` };
}

function StackedBucketRow({ point }: { point: WinstonEngagementPoint }) {
  const total = point.totalCount;
  const noteCount = point.noteCount;
  const sectionCount = point.sectionCount;
  const generalCount = point.generalCount;

  const segments = [
    { key: "note_id" as const, count: noteCount, color: "bg-indigo-500/80" },
    {
      key: "scope_key" as const,
      count: sectionCount,
      color: "bg-emerald-500/80",
    },
    {
      key: "general" as const,
      count: generalCount,
      color: "bg-orange-500/70",
    },
  ] satisfies Array<{
    key: ScopeKey;
    count: number;
    color: string;
  }>;

  const totalSafe = total > 0 ? total : 1;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">
          {formatBucketLabel(point.bucketStart)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {point.totalCount.toLocaleString()} total
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div className="flex h-full">
          {segments.map((s) => (
            <div
              key={s.key}
              className={`${s.color} transition-all`}
              style={stackedSegmentStyle(s.count, totalSafe)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-500/80" aria-hidden />
          Notes: {noteCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500/80" aria-hidden />
          Section: {sectionCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-orange-500/70" aria-hidden />
          Unscoped: {generalCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

type WinstonEngagementSectionProps = {
  initialData: WinstonEngagementTrend;
};

export function WinstonEngagementSection({
  initialData,
}: WinstonEngagementSectionProps) {
  const [data, setData] = useState(initialData);
  const [dateFrom, setDateFrom] = useState(data.dateFrom);
  const [dateTo, setDateTo] = useState(data.dateTo);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasAnyData = useMemo(
    () => data.totalConversations > 0 && data.points.some((p) => p.totalCount > 0),
    [data.totalConversations, data.points]
  );

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshWinstonEngagementTrend(dateFrom, dateTo);
      if (result.success) {
        if (result.data) {
          setData(result.data);
        } else {
          setError("No engagement trend data returned.");
        }
      } else {
        setError(result.error ?? "Failed to load trend.");
      }
    });
  }

  function startOfMonthISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <label
              htmlFor="winston-engagement-from"
              className="text-sm font-medium text-muted-foreground"
            >
              From
            </label>
            <input
              id="winston-engagement-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="winston-engagement-to"
              className="text-sm font-medium text-muted-foreground"
            >
              To
            </label>
            <input
              id="winston-engagement-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFrom(startOfMonthISO());
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
          >
            This month
          </Button>

          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="gap-2"
          >
            <RefreshCw className="size-4" aria-hidden />
            {isPending ? "Loading…" : "Apply"}
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {data.totalConversations.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {data.activeUserCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversations per active user
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {formatPerActive(data.conversationsPerActiveUser)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation volume by scope</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each row is a UTC week bucket starting on Monday.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {!hasAnyData ? (
            <p className="text-sm text-muted-foreground">
              No Winston conversations in this period.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {SCOPE_META.map((scope) => (
                  <span key={scope.key} className="inline-flex items-center gap-2">
                    <span className={`size-2 rounded-full ${scope.dot}`} aria-hidden />
                    {scope.label}
                  </span>
                ))}
              </div>

              {data.points.map((point) => (
                <StackedBucketRow key={point.bucketStart} point={point} />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

