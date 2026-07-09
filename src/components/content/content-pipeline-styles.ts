import type { ContentStatus } from "@/lib/content/types";

export type StageAccent = {
  bar: string;
  border: string;
  text: string;
  dropBg: string;
  ring: string;
  sectionBg: string;
  containerBorder: string;
};

export const STAGE_ACCENT: Record<ContentStatus, StageAccent> = {
  idea: {
    bar: "bg-blue-500",
    border: "border-blue-500/40",
    text: "text-blue-500",
    dropBg: "bg-blue-500/[0.04]",
    ring: "ring-blue-500/25",
    sectionBg: "bg-blue-500/[0.05]",
    containerBorder: "border-l-blue-500",
  },
  planned: {
    bar: "bg-wisk-section-content",
    border: "border-wisk-section-content/40",
    text: "text-wisk-section-content",
    dropBg: "bg-wisk-section-content/[0.04]",
    ring: "ring-wisk-section-content/25",
    sectionBg: "bg-wisk-section-content/[0.05]",
    containerBorder: "border-l-wisk-section-content",
  },
  in_progress: {
    bar: "bg-amber-500",
    border: "border-amber-500/40",
    text: "text-amber-500",
    dropBg: "bg-amber-500/[0.04]",
    ring: "ring-amber-500/25",
    sectionBg: "bg-amber-500/[0.05]",
    containerBorder: "border-l-amber-500",
  },
  scheduled: {
    bar: "bg-wisk-section-content",
    border: "border-wisk-section-content/40",
    text: "text-wisk-section-content",
    dropBg: "bg-wisk-section-content/[0.04]",
    ring: "ring-wisk-section-content/25",
    sectionBg: "bg-wisk-section-content/[0.05]",
    containerBorder: "border-l-wisk-section-content",
  },
  published: {
    bar: "bg-emerald-500",
    border: "border-emerald-500/40",
    text: "text-emerald-500",
    dropBg: "bg-emerald-500/[0.04]",
    ring: "ring-emerald-500/25",
    sectionBg: "bg-emerald-500/[0.05]",
    containerBorder: "border-l-emerald-500",
  },
};

export const CONTENT_CARD_WIDTH_CLASS = "w-[280px] shrink-0";
