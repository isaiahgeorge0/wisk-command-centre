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
  LeadDragOverlayCard,
} from "@/components/leads/lead-draggable-card";
import { LeadsPipelineStage } from "@/components/leads/leads-pipeline-stage";
import { usePipelineCollapse } from "@/components/leads/use-pipeline-collapse";
import { usePointerDndEnabled } from "@/components/leads/use-pointer-dnd";
import { PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { Lead, LeadStatus } from "@/lib/leads/types";

type LeadsPipelineProps = {
  grouped: Record<LeadStatus, Lead[]>;
  canAccessWinston: boolean;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onProjectCreated?: (projectId: string) => void;
  onLeadStatusChange: (
    lead: Lead,
    newStatus: LeadStatus,
    previousStatus: LeadStatus
  ) => Promise<boolean>;
};

function resolveTargetStatus(
  overId: string | number,
  grouped: Record<LeadStatus, Lead[]>
): LeadStatus | null {
  if (PIPELINE_STATUSES.includes(overId as LeadStatus)) {
    return overId as LeadStatus;
  }

  for (const status of PIPELINE_STATUSES) {
    if (grouped[status].some((lead) => lead.id === overId)) {
      return status;
    }
  }

  return null;
}

export function LeadsPipeline({
  grouped,
  canAccessWinston,
  onDelete,
  onLeadUpdate,
  onProjectCreated,
  onLeadStatusChange,
}: LeadsPipelineProps) {
  const dndEnabled = usePointerDndEnabled();
  const { expanded, toggle, expandStage } = usePipelineCollapse(grouped);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [layoutAnimation, setLayoutAnimation] = useState(true);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  const leadById = useMemo(() => {
    const map = new Map<string, Lead>();
    for (const status of PIPELINE_STATUSES) {
      for (const lead of grouped[status]) {
        map.set(lead.id, lead);
      }
    }
    return map;
  }, [grouped]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setLayoutAnimation(false);
    const lead = leadById.get(String(event.active.id));
    setActiveLead(lead ?? null);
  }, [leadById]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveLead(null);
      setLayoutAnimation(true);

      if (!dndEnabled) return;

      const { active, over } = event;
      if (!over) return;

      const lead = leadById.get(String(active.id));
      if (!lead) return;

      const sourceStatus = (active.data.current?.status as LeadStatus) ?? (lead.status as LeadStatus);
      const targetStatus = resolveTargetStatus(over.id, grouped);

      if (!targetStatus || targetStatus === sourceStatus) return;

      expandStage(targetStatus);
      await onLeadStatusChange(lead, targetStatus, sourceStatus);
    },
    [dndEnabled, expandStage, grouped, leadById, onLeadStatusChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveLead(null);
    setLayoutAnimation(true);
  }, []);

  const handleStatusChange = useCallback(
    async (lead: Lead, newStatus: LeadStatus) => {
      const previousStatus = lead.status as LeadStatus;
      if (newStatus === previousStatus) return;

      setLayoutAnimation(true);
      expandStage(newStatus);
      await onLeadStatusChange(lead, newStatus, previousStatus);
    },
    [expandStage, onLeadStatusChange]
  );

  const isDragging = activeLead !== null;

  const stages = (
    <LayoutGroup id="leads-pipeline">
      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
        {PIPELINE_STATUSES.map((status) => (
          <LeadsPipelineStage
            key={status}
            status={status}
            leads={grouped[status]}
            expanded={expanded[status]}
            onToggle={() => toggle(status)}
            dndEnabled={dndEnabled}
            isDragging={isDragging}
            canAccessWinston={canAccessWinston}
            onDelete={onDelete}
            onLeadUpdate={onLeadUpdate}
            onProjectCreated={onProjectCreated}
            onStatusChange={handleStatusChange}
            layoutAnimation={layoutAnimation}
          />
        ))}
      </div>
    </LayoutGroup>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={dndEnabled ? handleDragStart : undefined}
      onDragEnd={dndEnabled ? handleDragEnd : undefined}
      onDragCancel={dndEnabled ? handleDragCancel : undefined}
    >
      {stages}
      {dndEnabled ? (
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <LeadDragOverlayCard
              lead={activeLead}
              canAccessWinston={canAccessWinston}
              onDelete={onDelete}
              onLeadUpdate={onLeadUpdate}
              onProjectCreated={onProjectCreated}
              onStatusChange={handleStatusChange}
            />
          ) : null}
        </DragOverlay>
      ) : null}
    </DndContext>
  );
}
