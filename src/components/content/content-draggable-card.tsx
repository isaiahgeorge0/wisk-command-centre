"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

import { ContentPostCard } from "@/components/content/content-post-card";
import { CONTENT_CARD_WIDTH_CLASS } from "@/components/content/content-pipeline-styles";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

type ContentDraggableCardProps = {
  post: ContentPost;
  status: ContentStatus;
  contentGoals: Pick<Goal, "id" | "title">[];
  dndEnabled: boolean;
  onDelete: (post: ContentPost) => void;
  onPostUpdate: (post: ContentPost) => void;
  onStatusChange: (post: ContentPost, status: ContentStatus) => void;
  layoutAnimation: boolean;
};

export function ContentDraggableCard({
  post,
  status,
  contentGoals,
  dndEnabled,
  onDelete,
  onPostUpdate,
  onStatusChange,
  layoutAnimation,
}: ContentDraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: post.id,
    disabled: !dndEnabled,
    data: { type: "content", post, status },
  });

  const style = dndEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      layout={layoutAnimation && !isDragging}
      layoutId={layoutAnimation ? `content-${post.id}` : undefined}
      style={style}
      className={cn(CONTENT_CARD_WIDTH_CLASS, isDragging && "opacity-40")}
      {...(dndEnabled ? { ...attributes, ...listeners } : {})}
    >
      <ContentPostCard
        post={post}
        contentGoals={contentGoals}
        onDelete={onDelete}
        onPostUpdate={onPostUpdate}
        onStatusChange={(nextStatus) => onStatusChange(post, nextStatus)}
        className={dndEnabled ? "cursor-grab active:cursor-grabbing" : undefined}
      />
    </motion.div>
  );
}

type ContentDragOverlayCardProps = {
  post: ContentPost;
  contentGoals: Pick<Goal, "id" | "title">[];
  onDelete: (post: ContentPost) => void;
  onPostUpdate: (post: ContentPost) => void;
  onStatusChange: (post: ContentPost, status: ContentStatus) => void;
};

export function ContentDragOverlayCard({
  post,
  contentGoals,
  onDelete,
  onPostUpdate,
  onStatusChange,
}: ContentDragOverlayCardProps) {
  return (
    <div className={cn(CONTENT_CARD_WIDTH_CLASS, "rotate-1 shadow-lg")}>
      <ContentPostCard
        post={post}
        contentGoals={contentGoals}
        onDelete={onDelete}
        onPostUpdate={onPostUpdate}
        onStatusChange={(status) => onStatusChange(post, status)}
        isDragOverlay
      />
    </div>
  );
}
