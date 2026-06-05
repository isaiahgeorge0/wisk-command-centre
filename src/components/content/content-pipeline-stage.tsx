"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { ContentDraggableCard } from "@/components/content/content-draggable-card";
import { STAGE_ACCENT } from "@/components/content/content-pipeline-styles";
import {
  CONTENT_STATUS_LABELS,
} from "@/lib/content/constants";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

type ContentPipelineStageProps = {
  status: ContentStatus;
  posts: ContentPost[];
  contentGoals: Pick<Goal, "id" | "title">[];
  expanded: boolean;
  onToggle: () => void;
  dndEnabled: boolean;
  isDragging: boolean;
  onDelete: (post: ContentPost) => void;
  onPostUpdate: (post: ContentPost) => void;
  onStatusChange: (post: ContentPost, status: ContentStatus) => void;
  layoutAnimation: boolean;
};

export function ContentPipelineStage({
  status,
  posts,
  contentGoals,
  expanded,
  onToggle,
  dndEnabled,
  isDragging,
  onDelete,
  onPostUpdate,
  onStatusChange,
  layoutAnimation,
}: ContentPipelineStageProps) {
  const accent = STAGE_ACCENT[status];
  const { reduced } = useMotionSafe();
  const isEmpty = posts.length === 0;

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !dndEnabled,
    data: { type: "stage", status },
  });

  const showEmptyDropPlaceholder =
    isEmpty && dndEnabled && isDragging && isOver;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "border-l-4 transition-colors",
        accent.sectionBg,
        accent.containerBorder,
        dndEnabled && isOver && isDragging && accent.ring,
        dndEnabled && isOver && isDragging && "ring-2 ring-inset"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
          expanded && "border-b border-border/40"
        )}
        aria-expanded={expanded}
      >
        <span
          className={cn("h-8 w-1 shrink-0 rounded-full", accent.bar)}
          aria-hidden
        />
        <span className={cn("text-sm font-semibold", accent.text)}>
          {CONTENT_STATUS_LABELS[status]}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs tabular-nums",
            accent.dropBg,
            accent.text
          )}
        >
          {posts.length}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key={`${status}-cards`}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
            }
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {isEmpty ? (
                showEmptyDropPlaceholder ? (
                  <div
                    className={cn(
                      "flex min-h-[7.5rem] items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-sm",
                      accent.border,
                      accent.dropBg,
                      accent.text,
                      isOver && "border-solid"
                    )}
                  >
                    Drop content here
                  </div>
                ) : (
                  <div className="flex min-h-[4rem] items-center justify-center rounded-lg border border-dashed border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
                    No posts
                  </div>
                )
              ) : (
                <SortableContext
                  items={posts.map((post) => post.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {posts.map((post) => (
                      <ContentDraggableCard
                        key={post.id}
                        post={post}
                        status={status}
                        contentGoals={contentGoals}
                        dndEnabled={dndEnabled}
                        onDelete={onDelete}
                        onPostUpdate={onPostUpdate}
                        onStatusChange={onStatusChange}
                        layoutAnimation={layoutAnimation}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </motion.div>
        ) : isEmpty && dndEnabled && isDragging && isOver ? (
          <motion.div
            key={`${status}-drop-collapsed`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <div
              className={cn(
                "flex min-h-[3.5rem] items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center text-sm",
                accent.border,
                accent.dropBg,
                accent.text
              )}
            >
              Drop content here
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
