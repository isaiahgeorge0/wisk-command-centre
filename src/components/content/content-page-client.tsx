"use client";

import { Clapperboard, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateContentPostStatus } from "@/app/(dashboard)/content/actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { ContentCalendarTab } from "@/components/content/content-calendar-tab";
import { ContentEmptyState } from "@/components/content/content-empty-state";
import { ContentPipeline } from "@/components/content/content-pipeline";
import { ContentStatsBar } from "@/components/content/content-stats-bar";
import {
  ContentViewTabs,
  type ContentViewTab,
} from "@/components/content/content-view-tabs";
import { DeleteContentDialog } from "@/components/content/delete-content-dialog";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { WinstonBrainstormPanel } from "@/components/winston/winston-brainstorm-panel";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { todayDateISO } from "@/lib/content/format";
import {
  buildContentStats,
  groupPostsByStatus,
  isContentAwaitingDate,
} from "@/lib/content/selectors";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import type { WinstonProposalCommitResult } from "@/lib/winston/proposal";
import { cn } from "@/lib/utils";

type ContentPageClientProps = {
  initialPosts: ContentPost[];
  contentGoals: Pick<Goal, "id" | "title">[];
  canAccessWinston: boolean;
};

export function ContentPageClient({
  initialPosts,
  contentGoals,
  canAccessWinston,
}: ContentPageClientProps) {
  const router = useRouter();
  const { openContentAdd } = useQuickAdd();
  const [posts, setPosts] = useState(initialPosts);
  const [activeTab, setActiveTab] = useState<ContentViewTab>("calendar");
  const [awaitingDateOnly, setAwaitingDateOnly] = useState(false);
  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const awaitingDateCount = useMemo(
    () => posts.filter(isContentAwaitingDate).length,
    [posts]
  );

  const boardPosts = useMemo(
    () => (awaitingDateOnly ? posts.filter(isContentAwaitingDate) : posts),
    [posts, awaitingDateOnly]
  );

  const grouped = useMemo(() => groupPostsByStatus(boardPosts), [boardPosts]);
  const stats = useMemo(() => buildContentStats(posts), [posts]);

  const handleDeleted = useCallback(
    (id: string) => {
      setPosts((prev) => prev.filter((post) => post.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((post: ContentPost) => {
    setDeleteTarget({ id: post.id, title: post.title });
  }, []);

  const handlePostUpdate = useCallback((updated: ContentPost) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === updated.id ? updated : post))
    );
  }, []);

  const handlePostStatusChange = useCallback(
    async (
      post: ContentPost,
      newStatus: ContentStatus,
      previousStatus: ContentStatus
    ): Promise<boolean> => {
      if (newStatus === previousStatus) return true;

      const optimisticPublishedDate =
        newStatus === "published" && !post.published_date
          ? todayDateISO()
          : post.published_date;

      const optimistic = {
        ...post,
        status: newStatus,
        published_date: optimisticPublishedDate,
      };

      setPosts((prev) =>
        prev.map((item) => (item.id === post.id ? optimistic : item))
      );

      const result = await updateContentPostStatus(post.id, newStatus);
      if (!result.success || !result.data) {
        setPosts((prev) =>
          prev.map((item) => (item.id === post.id ? post : item))
        );
        return false;
      }

      setPosts((prev) =>
        prev.map((item) => (item.id === post.id ? result.data! : item))
      );
      router.refresh();
      return true;
    },
    [router]
  );

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Content"
          subtitle="Plan, schedule, and track your content across platforms."
          icon={<Clapperboard className="size-6 text-wisk-section-content" />}
          accent="content"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setBrainstormOpen((open) => !open)}
            aria-pressed={brainstormOpen}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              brainstormOpen
                ? "border-wisk-section-winston/50 bg-wisk-section-winston/15 text-foreground"
                : "border-wisk-section-winston/30 bg-gradient-to-r from-wisk-section-winston/10 to-wisk-section-winston/10 text-foreground hover:border-wisk-section-winston/50"
            )}
          >
            <Sparkles className="size-4 text-wisk-section-winston" aria-hidden />
            <span className="hidden sm:inline">Brainstorm with Winston</span>
            <span className="sm:hidden">Winston</span>
          </button>
          <Button className="shrink-0 gap-2" onClick={() => openContentAdd()}>
            <Plus className="size-4" />
            Add content
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-col",
          brainstormOpen ? "lg:flex-row lg:items-start lg:gap-4" : ""
        )}
      >
        <div className={cn("min-w-0 flex-1", brainstormOpen ? "hidden md:block" : "")}>
          {posts.length === 0 ? (
            <ContentEmptyState onAdd={() => openContentAdd()} />
          ) : (
            <>
              <ContentStatsBar stats={stats} />
              <ContentViewTabs activeTab={activeTab} onChange={setActiveTab} />
              {activeTab === "calendar" ? (
                <ContentCalendarTab posts={posts} contentGoals={contentGoals} />
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={awaitingDateOnly}
                      onClick={() => setAwaitingDateOnly((on) => !on)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        awaitingDateOnly
                          ? "border-wisk-section-content/40 bg-wisk-section-content/15 text-wisk-section-content"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      Awaiting a date
                      {awaitingDateCount > 0 ? (
                        <span className="ml-1.5 tabular-nums">
                          {awaitingDateCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                  <ContentPipeline
                    grouped={grouped}
                    contentGoals={contentGoals}
                    onDelete={handleDeleteRequest}
                    onPostUpdate={handlePostUpdate}
                    onPostStatusChange={handlePostStatusChange}
                  />
                </>
              )}
            </>
          )}
        </div>
        {brainstormOpen ? (
          <div className="mt-4 min-h-[28rem] lg:mt-0 lg:h-[calc(100dvh-12rem)]">
            <WinstonBrainstormPanel
              open={brainstormOpen}
              surface="content"
              canAccessWinston={canAccessWinston}
              onClose={() => setBrainstormOpen(false)}
              onCommitted={(result) => {
                setProposalToast(result);
                setBrainstormOpen(false);
                router.refresh();
              }}
            />
          </div>
        ) : null}
      </div>

      <DeleteContentDialog
        postId={deleteTarget?.id ?? null}
        postTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
      <WinstonProposalSuccessToast
        result={proposalToast}
        onDismiss={() => setProposalToast(null)}
      />
    </PageTransition>
  );
}
