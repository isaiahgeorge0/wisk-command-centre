"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { LayoutGroup } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import {
  ContentDragOverlayCard,
} from "@/components/content/content-draggable-card";
import { ContentPipelineStage } from "@/components/content/content-pipeline-stage";
import { useContentPipelineCollapse } from "@/components/content/use-content-pipeline-collapse";
import { usePointerDndEnabled } from "@/components/leads/use-pointer-dnd";
import { PIPELINE_STATUSES } from "@/lib/content/constants";
import type { ContentPost, ContentStatus } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";

type ContentPipelineProps = {
  grouped: Record<ContentStatus, ContentPost[]>;
  contentGoals: Pick<Goal, "id" | "title">[];
  onDelete: (post: ContentPost) => void;
  onPostUpdate: (post: ContentPost) => void;
  onPostStatusChange: (
    post: ContentPost,
    newStatus: ContentStatus,
    previousStatus: ContentStatus
  ) => Promise<boolean>;
};

function resolveTargetStatus(
  overId: string | number,
  grouped: Record<ContentStatus, ContentPost[]>
): ContentStatus | null {
  if (PIPELINE_STATUSES.includes(overId as ContentStatus)) {
    return overId as ContentStatus;
  }

  for (const status of PIPELINE_STATUSES) {
    if (grouped[status].some((post) => post.id === overId)) {
      return status;
    }
  }

  return null;
}

export function ContentPipeline({
  grouped,
  contentGoals,
  onDelete,
  onPostUpdate,
  onPostStatusChange,
}: ContentPipelineProps) {
  const dndEnabled = usePointerDndEnabled();
  const { expanded, toggle, expandStage } = useContentPipelineCollapse(grouped);
  const [activePost, setActivePost] = useState<ContentPost | null>(null);
  const [layoutAnimation, setLayoutAnimation] = useState(true);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  const postById = useMemo(() => {
    const map = new Map<string, ContentPost>();
    for (const status of PIPELINE_STATUSES) {
      for (const post of grouped[status]) {
        map.set(post.id, post);
      }
    }
    return map;
  }, [grouped]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setLayoutAnimation(false);
      const post = postById.get(String(event.active.id));
      setActivePost(post ?? null);
    },
    [postById]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActivePost(null);
      setLayoutAnimation(true);

      if (!dndEnabled) return;

      const { active, over } = event;
      if (!over) return;

      const post = postById.get(String(active.id));
      if (!post) return;

      const sourceStatus =
        (active.data.current?.status as ContentStatus) ??
        (post.status as ContentStatus);
      const targetStatus = resolveTargetStatus(over.id, grouped);

      if (!targetStatus || targetStatus === sourceStatus) return;

      expandStage(targetStatus);
      await onPostStatusChange(post, targetStatus, sourceStatus);
    },
    [dndEnabled, expandStage, grouped, postById, onPostStatusChange]
  );

  const handleDragCancel = useCallback(() => {
    setActivePost(null);
    setLayoutAnimation(true);
  }, []);

  const handleStatusChange = useCallback(
    async (post: ContentPost, newStatus: ContentStatus) => {
      const previousStatus = post.status as ContentStatus;
      if (newStatus === previousStatus) return;

      setLayoutAnimation(true);
      expandStage(newStatus);
      await onPostStatusChange(post, newStatus, previousStatus);
    },
    [expandStage, onPostStatusChange]
  );

  const isDragging = activePost !== null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={dndEnabled ? handleDragStart : undefined}
      onDragEnd={dndEnabled ? handleDragEnd : undefined}
      onDragCancel={dndEnabled ? handleDragCancel : undefined}
    >
      <LayoutGroup id="content-pipeline">
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          {PIPELINE_STATUSES.map((status) => (
            <ContentPipelineStage
              key={status}
              status={status}
              posts={grouped[status]}
              contentGoals={contentGoals}
              expanded={expanded[status]}
              onToggle={() => toggle(status)}
              dndEnabled={dndEnabled}
              isDragging={isDragging}
              onDelete={onDelete}
              onPostUpdate={onPostUpdate}
              onStatusChange={handleStatusChange}
              layoutAnimation={layoutAnimation}
            />
          ))}
        </div>
      </LayoutGroup>

      {dndEnabled ? (
        <DragOverlay dropAnimation={null}>
          {activePost ? (
            <ContentDragOverlayCard
              post={activePost}
              contentGoals={contentGoals}
              onDelete={onDelete}
              onPostUpdate={onPostUpdate}
              onStatusChange={handleStatusChange}
            />
          ) : null}
        </DragOverlay>
      ) : null}
    </DndContext>
  );
}
