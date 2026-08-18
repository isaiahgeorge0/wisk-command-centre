"use client";

import { Clapperboard, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateContentPostStatus } from "@/app/(dashboard)/content/actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { ContentCalendarTab } from "@/components/content/content-calendar-tab";
import { ContentEmptyState } from "@/components/content/content-empty-state";
import { ContentFormDialog } from "@/components/content/content-form-dialog";
import { ContentPipeline } from "@/components/content/content-pipeline";
import { ContentStatsBar } from "@/components/content/content-stats-bar";
import {
  ContentViewTabs,
  type ContentViewTab,
} from "@/components/content/content-view-tabs";
import { DeleteContentDialog } from "@/components/content/delete-content-dialog";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { WinstonSectionEntry } from "@/components/winston/winston-entry-button";
import { todayDateISO } from "@/lib/content/format";
import {
  buildContentStats,
  groupPostsByStatus,
  isContentAwaitingDate,
} from "@/lib/content/selectors";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

type ContentPageClientProps = {
  initialPosts: ContentPost[];
  contentGoals: Pick<Goal, "id" | "title">[];
};

function parseContentView(value: string | null): ContentViewTab {
  return value === "board" ? "board" : "calendar";
}

export function ContentPageClient({
  initialPosts,
  contentGoals,
}: ContentPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openContentAdd } = useQuickAdd();
  const [posts, setPosts] = useState(initialPosts);
  const activeTab = parseContentView(searchParams.get("view"));
  const [awaitingDateOnly, setAwaitingDateOnly] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const setActiveTab = useCallback(
    (tab: ContentViewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "calendar") {
        params.delete("view");
      } else {
        params.set("view", tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

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

  const handleDeleted = useCallback((id: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== id));
    setEditPost((current) => (current?.id === id ? null : current));
  }, []);

  const handleDeleteRequest = useCallback((post: ContentPost) => {
    setDeleteTarget({ id: post.id, title: post.title });
  }, []);

  const handlePostUpdate = useCallback((updated: ContentPost) => {
    setPosts((prev) => {
      const exists = prev.some((post) => post.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((post) => (post.id === updated.id ? updated : post));
    });
    setEditPost((current) => (current?.id === updated.id ? updated : current));
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
          <WinstonSectionEntry section="content-calendar" />
          <Button className="shrink-0 gap-2" onClick={() => openContentAdd()}>
            <Plus className="size-4" />
            Add content
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <ContentEmptyState onAdd={() => openContentAdd()} />
      ) : (
        <>
          <ContentStatsBar stats={stats} />
          <ContentViewTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "calendar" ? (
            <ContentCalendarTab
              posts={posts}
              onEditPost={setEditPost}
            />
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

      <ContentFormDialog
        open={editPost !== null}
        onOpenChange={(open) => {
          if (!open) setEditPost(null);
        }}
        contentGoals={contentGoals}
        post={editPost}
        onSaved={handlePostUpdate}
        onDelete={handleDeleteRequest}
      />

      <DeleteContentDialog
        postId={deleteTarget?.id ?? null}
        postTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
