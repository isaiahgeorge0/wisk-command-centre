"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateContentPostStatus } from "@/app/(dashboard)/content/actions";
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
import { todayDateISO } from "@/lib/content/format";
import {
  buildContentStats,
  groupPostsByStatus,
} from "@/lib/content/selectors";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

type ContentPageClientProps = {
  initialPosts: ContentPost[];
  contentGoals: Pick<Goal, "id" | "title">[];
};

export function ContentPageClient({
  initialPosts,
  contentGoals,
}: ContentPageClientProps) {
  const router = useRouter();
  const { openContentAdd } = useQuickAdd();
  const [posts, setPosts] = useState(initialPosts);
  const [activeTab, setActiveTab] = useState<ContentViewTab>("calendar");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const grouped = useMemo(() => groupPostsByStatus(posts), [posts]);
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
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Content</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Plan, schedule, and publish content across your platforms.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => openContentAdd()}>
          <Plus className="size-4" />
          Add content
        </Button>
      </div>

      {posts.length === 0 ? (
        <ContentEmptyState onAdd={() => openContentAdd()} />
      ) : (
        <>
          <ContentStatsBar stats={stats} />
          <ContentViewTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "calendar" ? (
            <ContentCalendarTab posts={posts} contentGoals={contentGoals} />
          ) : (
            <ContentPipeline
              grouped={grouped}
              contentGoals={contentGoals}
              onDelete={handleDeleteRequest}
              onPostUpdate={handlePostUpdate}
              onPostStatusChange={handlePostStatusChange}
            />
          )}
        </>
      )}

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
