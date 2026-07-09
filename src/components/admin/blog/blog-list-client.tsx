"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  cancelBlogPostSchedule,
  publishBlogPost,
  unpublishBlogPost,
} from "@/app/(dashboard)/admin/blog/actions";
import { DeleteBlogPostDialog } from "@/components/admin/blog/delete-blog-post-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatBlogDate, tagsToString } from "@/lib/blog/format";
import {
  BLOG_STATUS_BADGE_CLASSES,
  BLOG_STATUS_LABELS,
  getBlogPostStatus,
  type BlogPost,
} from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type BlogListClientProps = {
  posts: BlogPost[];
};

function StatusBadge({ post }: { post: BlogPost }) {
  const status = getBlogPostStatus(post);
  return (
    <Badge
      variant="outline"
      className={cn(BLOG_STATUS_BADGE_CLASSES[status])}
    >
      {BLOG_STATUS_LABELS[status]}
    </Badge>
  );
}

export function BlogListClient({ posts: initialPosts }: BlogListClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const handlePublishToggle = (post: BlogPost) => {
    setError(null);
    setPendingId(post.id);

    startTransition(async () => {
      const result = post.published
        ? await unpublishBlogPost(post.id)
        : await publishBlogPost(post.id);

      setPendingId(null);

      if (!result.success || !result.data) {
        setError(result.success ? "Something went wrong." : result.error);
        return;
      }

      setPosts((current) =>
        current.map((item) => (item.id === post.id ? result.data! : item))
      );
      router.refresh();
    });
  };

  const handleCancelSchedule = (post: BlogPost) => {
    setError(null);
    setPendingId(post.id);

    startTransition(async () => {
      const result = await cancelBlogPostSchedule(post.id);

      setPendingId(null);

      if (!result.success || !result.data) {
        setError(result.success ? "Something went wrong." : result.error);
        return;
      }

      setPosts((current) =>
        current.map((item) => (item.id === post.id ? result.data! : item))
      );
      router.refresh();
    });
  };

  const handleDeleted = (id: string) => {
    setPosts((current) => current.filter((post) => post.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Published / Scheduled</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No blog posts yet.{" "}
                  <Link
                    href="/admin/blog/new"
                    className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                  >
                    Create your first post
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              posts.map((post) => {
                const status = getBlogPostStatus(post);
                const isPending = pendingId === post.id;

                return (
                  <tr key={post.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="font-medium text-foreground hover:text-orange-700 dark:hover:text-orange-300"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        /{post.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge post={post} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {status === "published" ? (
                        formatBlogDate(post.published_at)
                      ) : status === "scheduled" ? (
                        <span className="text-wisk-lime">
                          {formatBlogDate(post.scheduled_for)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tagsToString(post.tags) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Edit
                        </Link>

                        {status === "scheduled" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleCancelSchedule(post)}
                          >
                            {isPending ? "Saving…" : "Cancel schedule"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handlePublishToggle(post)}
                          >
                            {isPending
                              ? "Saving…"
                              : post.published
                                ? "Unpublish"
                                : "Publish"}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ id: post.id, title: post.title })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DeleteBlogPostDialog
        postId={deleteTarget?.id ?? null}
        postTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
