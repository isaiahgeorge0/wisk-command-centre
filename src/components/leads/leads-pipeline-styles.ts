import type { LeadStatus } from "@/lib/leads/types";

export type StageAccent = {
  bar: string;
  border: string;
  text: string;
  dropBg: string;
  ring: string;
  sectionBg: string;
  containerBorder: string;
};

export const STAGE_ACCENT: Record<LeadStatus, StageAccent> = {
  new: {
    bar: "bg-blue-500",
    border: "border-blue-500/40",
    text: "text-blue-500",
    dropBg: "bg-blue-500/[0.04]",
    ring: "ring-blue-500/25",
    sectionBg: "bg-blue-500/[0.05]",
    containerBorder: "border-l-blue-500",
  },
  contacted: {
    bar: "bg-wisk-purple",
    border: "border-wisk-purple/40",
    text: "text-wisk-purple",
    dropBg: "bg-wisk-purple/[0.04]",
    ring: "ring-wisk-purple/25",
    sectionBg: "bg-wisk-purple/[0.05]",
    containerBorder: "border-l-wisk-purple",
  },
  qualified: {
    bar: "bg-amber-500",
    border: "border-amber-500/40",
    text: "text-amber-500",
    dropBg: "bg-amber-500/[0.04]",
    ring: "ring-amber-500/25",
    sectionBg: "bg-amber-500/[0.05]",
    containerBorder: "border-l-amber-500",
  },
  proposal_sent: {
    bar: "bg-wisk-teal",
    border: "border-wisk-teal/40",
    text: "text-wisk-teal",
    dropBg: "bg-wisk-teal/[0.04]",
    ring: "ring-wisk-teal/25",
    sectionBg: "bg-wisk-teal/[0.05]",
    containerBorder: "border-l-wisk-teal",
  },
  won: {
    bar: "bg-emerald-500",
    border: "border-emerald-500/40",
    text: "text-emerald-500",
    dropBg: "bg-emerald-500/[0.04]",
    ring: "ring-emerald-500/25",
    sectionBg: "bg-emerald-500/[0.05]",
    containerBorder: "border-l-emerald-500",
  },
  lost: {
    bar: "bg-muted-foreground/40",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground",
    dropBg: "bg-muted/20",
    ring: "ring-muted-foreground/20",
    sectionBg: "bg-muted/30",
    containerBorder: "border-l-muted-foreground/40",
  },
};

export const LEAD_CARD_WIDTH_CLASS = "w-[280px] shrink-0";
