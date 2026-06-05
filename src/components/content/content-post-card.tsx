"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateContentPost } from "@/app/(dashboard)/content/actions";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { ContentForm } from "@/components/content/content-form";
import { ContentPlatformBadge } from "@/components/content/content-platform-badge";
import { ContentStatusMenu } from "@/components/content/content-status-menu";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatContentDate, truncateHook } from "@/lib/content/format";
import { postToFormInput } from "@/lib/content/form";
import type {
  ContentFormInput,
  ContentPost,
  ContentStatus,
} from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

type ContentPostCardProps = {
  post: ContentPost;
  contentGoals: Pick<Goal, "id" | "title">[];
  onDelete: (post: ContentPost) => void;
  onPostUpdate: (post: ContentPost) => void;
  onStatusChange?: (status: ContentStatus) => void;
  isDragOverlay?: boolean;
  className?: string;
};

export function ContentPostCard({
  post,
  contentGoals,
  onDelete,
  onPostUpdate,
  onStatusChange,
  isDragOverlay = false,
  className,
}: ContentPostCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ContentFormInput>(postToFormInput(post));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-content-${post.id}`;
  const status = (post.status as ContentStatus) ?? "idea";
  const hookPreview = truncateHook(post.hook);

  const cancelEdit = () => {
    setValues(postToFormInput(post));
    setError(null);
    setEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateContentPost(post.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onPostUpdate(result.data);
      }
      setEditing(false);
      router.refresh();
    });
  };

  const handleCardClick = () => {
    if (editing) return;
    setExpanded((prev) => !prev);
  };

  if (editing) {
    return (
      <Card className="border-border/70 border-wisk-purple/25 bg-card/90 shadow-sm">
        <CardHeader className="gap-2 px-4 pb-2 pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Editing content
          </p>
        </CardHeader>
        <CardContent className="px-4">
          <form id={formId} onSubmit={handleSave}>
            <ContentForm
              formId={formId}
              values={values}
              onChange={setValues}
              contentGoals={contentGoals}
              disabled={isPending}
            />
            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        </CardContent>
        <CardFooter className="gap-2 border-t border-border/60 px-4 pb-4 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative border-border/70 bg-card/80 shadow-sm transition-colors hover:bg-card",
        isDragOverlay && "shadow-md",
        !isDragOverlay && "cursor-pointer",
        status === "published" &&
          "border-emerald-500/40 bg-emerald-500/[0.04]",
        className
      )}
      onClick={isDragOverlay ? undefined : handleCardClick}
    >
      <CardHeader className="gap-2 px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {post.title}
          </h3>
          <ContentPlatformBadge platform={post.platform} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ContentTypeBadge contentType={post.content_type} />
          {post.scheduled_date ? (
            <span className="text-xs text-muted-foreground">
              {formatContentDate(post.scheduled_date)}
            </span>
          ) : null}
        </div>

        {hookPreview ? (
          <p className="line-clamp-2 text-xs italic text-muted-foreground">
            &ldquo;{hookPreview}&rdquo;
          </p>
        ) : null}

        <ExpandableSection
          open={expanded}
          className="space-y-3 border-t border-border/50 pt-3"
        >
          <div onClick={(e) => e.stopPropagation()} className="space-y-3">
            {post.description?.trim() ? (
              <p className="whitespace-pre-wrap text-xs text-foreground">
                {post.description}
              </p>
            ) : null}
            {post.tags?.length ? (
              <p className="text-xs text-muted-foreground">
                Tags: {post.tags.join(", ")}
              </p>
            ) : null}
            {post.published_date ? (
              <p className="text-xs text-muted-foreground">
                Published: {formatContentDate(post.published_date)}
              </p>
            ) : null}
            <ContentStatusMenu
              currentStatus={status}
              onStatusChange={(nextStatus) => onStatusChange?.(nextStatus)}
              disabled={isPending}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpanded(true);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(post)}
              >
                Delete
              </Button>
            </div>
          </div>
        </ExpandableSection>

        {!expanded ? (
          <p className="text-xs text-muted-foreground">Click to expand</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
