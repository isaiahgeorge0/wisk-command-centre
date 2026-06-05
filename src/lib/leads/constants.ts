import type { LeadSource, LeadStatus } from "@/lib/leads/types";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

export const PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
];

export const ACTIVE_PIPELINE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
];

export const LEAD_STATUS_BADGE_CLASS: Record<LeadStatus, string> = {
  new: "border-wisk-teal/30 bg-wisk-teal/15 text-wisk-teal",
  contacted: "border-wisk-purple/30 bg-wisk-purple/15 text-wisk-purple",
  qualified: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  proposal_sent: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  won: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  lost: "border-border bg-muted text-muted-foreground",
};

export const LEAD_SOURCE_BADGE_CLASS: Record<LeadSource, string> = {
  TikTok: "border-wisk-purple/25 bg-wisk-purple/10 text-wisk-purple",
  Instagram: "border-pink-500/25 bg-pink-500/10 text-pink-500",
  Referral: "border-wisk-teal/25 bg-wisk-teal/10 text-wisk-teal",
  Website: "border-blue-500/25 bg-blue-500/10 text-blue-500",
  LinkedIn: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Cold outreach": "border-border bg-muted text-muted-foreground",
  Other: "border-border bg-muted/60 text-muted-foreground",
};

export const LEAD_CARD_STATUS_CLASS: Record<LeadStatus, string> = {
  new: "border-border/60",
  contacted: "border-border/60",
  qualified: "border-border/60",
  proposal_sent: "border-border/60",
  won: "border-emerald-500/40 bg-emerald-500/[0.04]",
  lost: "border-border/40 opacity-70",
};
