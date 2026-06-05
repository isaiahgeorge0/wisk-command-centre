"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

import { LeadCard } from "@/components/leads/lead-card";
import {
  LEAD_CARD_WIDTH_CLASS,
} from "@/components/leads/leads-pipeline-styles";
import type { Lead, LeadStatus } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadDraggableCardProps = {
  lead: Lead;
  status: LeadStatus;
  dndEnabled: boolean;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  layoutAnimation: boolean;
};

export function LeadDraggableCard({
  lead,
  status,
  dndEnabled,
  onDelete,
  onLeadUpdate,
  onStatusChange,
  layoutAnimation,
}: LeadDraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    disabled: !dndEnabled,
    data: {
      type: "lead",
      lead,
      status,
    },
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
      layoutId={layoutAnimation ? `lead-${lead.id}` : undefined}
      style={style}
      className={cn(LEAD_CARD_WIDTH_CLASS, isDragging && "opacity-40")}
      {...(dndEnabled ? { ...attributes, ...listeners } : {})}
    >
      <LeadCard
        lead={lead}
        onDelete={onDelete}
        onLeadUpdate={onLeadUpdate}
        onStatusChange={(nextStatus) => onStatusChange(lead, nextStatus)}
        isDragOverlay={false}
        className={dndEnabled ? "cursor-grab active:cursor-grabbing" : undefined}
      />
    </motion.div>
  );
}

type LeadDragOverlayCardProps = {
  lead: Lead;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
};

export function LeadDragOverlayCard({
  lead,
  onDelete,
  onLeadUpdate,
  onStatusChange,
}: LeadDragOverlayCardProps) {
  return (
    <div className={cn(LEAD_CARD_WIDTH_CLASS, "rotate-1 shadow-lg")}>
      <LeadCard
        lead={lead}
        onDelete={onDelete}
        onLeadUpdate={onLeadUpdate}
        onStatusChange={(status) => onStatusChange(lead, status)}
        isDragOverlay
      />
    </div>
  );
}
