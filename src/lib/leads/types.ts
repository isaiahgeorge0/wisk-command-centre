export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "TikTok",
  "Instagram",
  "Referral",
  "Website",
  "LinkedIn",
  "Cold outreach",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_VALUE_TYPES = ["one_time", "monthly"] as const;

export type LeadValueType = (typeof LEAD_VALUE_TYPES)[number];

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource | string;
  service_interest: string;
  status: LeadStatus | string;
  value: number | null;
  /** Defaults to one_time when absent (pre-migration rows). */
  value_type?: LeadValueType;
  notes: string | null;
  contacted_at: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  /** Set when a Research lead intelligence brief is generated (index stamp). */
  research_brief_generated_at?: string | null;
  /** Short summary from the latest generated brief for Research hub index. */
  research_brief_summary?: string | null;
};

export type LeadFormInput = {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource | string;
  service_interest: string;
  status: LeadStatus;
  value?: string;
  value_type?: LeadValueType;
  notes?: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type ConvertLeadToProjectInput = {
  name: string;
  deadline?: string;
  value?: string;
  first_task?: string;
};

export const LEAD_ACTIVITY_TYPES = [
  "note",
  "call",
  "email",
  "meeting",
  "stage_change",
  "follow_up_set",
  "ai_notes",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export type LeadActivity = {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: LeadActivityType;
  title: string;
  content?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type LeadActivityFormInput = {
  activity_type: LeadActivityType;
  title: string;
  content?: string;
};

export type LeadWithActivity = Lead & {
  last_activity_at: string | null;
};

export type LeadsView = "pipeline" | "table";

export type LeadsSortKey =
  | "follow_up_date"
  | "name"
  | "value"
  | "last_activity"
  | "days_in_stage"
  | "stage";

export type LeadsFilterState = {
  search: string;
  stage: LeadStatus | "all";
};

export type CallNotesSentiment = "positive" | "neutral" | "negative";

export type CallNotesResult = {
  summary: string;
  keyDetails: string[];
  objections: string[];
  nextSteps: string[];
  suggestedStage: string | null;
  suggestedValue: number | null;
  followUpDate: string | null;
  sentiment: CallNotesSentiment;
  taskSuggestions: string[];
};

export type CallNotesActions = {
  saveNotes: boolean;
  updateStage: boolean;
  updateValue: boolean;
  setFollowUp: boolean;
  createTasks: string[];
};

export type PipelineHealthFocus = {
  leadId: string;
  leadName: string;
  /** Raw lead value from source data — never from Winston prose. */
  value: number | null;
  valueType: LeadValueType;
  issue: string;
  suggestedAction: string;
  urgency: "high" | "medium" | "low";
};

export type PipelineValueSplit = {
  oneTime: number;
  monthly: number;
};

export type PipelineHealthResult = {
  summary: string;
  focuses: PipelineHealthFocus[];
  /** Precomputed from lead records; UI formats — do not parse from summary. */
  valueAtRisk: PipelineValueSplit;
  generatedAt: string;
};

export type LeadResearchCitation = {
  title: string;
  url: string;
  publisher?: string | null;
  snippet: string;
};

export type LeadResearchClaim = {
  text: string;
  citationIndex: number;
};

export type LeadResearchBrief = {
  summary: string;
  companyBackground: LeadResearchClaim[];
  budgetSignals: LeadResearchClaim[];
  painPoints: LeadResearchClaim[];
  citations: LeadResearchCitation[];
  generatedAt: string;
};
