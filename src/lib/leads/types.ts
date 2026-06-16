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
  notes: string | null;
  contacted_at: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadFormInput = {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource | string;
  service_interest: string;
  status: LeadStatus;
  value?: string;
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
