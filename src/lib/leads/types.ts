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
