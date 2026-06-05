export type FeedbackType = "bug_report" | "feature_request" | "general";

export type FeedbackStatus = "new" | "reviewed" | "actioned";

export type FeedbackFilter = "all" | FeedbackStatus;

export type Feedback = {
  id: string;
  user_id: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  created_at: string;
  admin_notes: string | null;
};

export type AdminFeedback = Feedback & {
  user_name: string | null;
  user_email: string;
};

export type FeedbackStats = {
  newCount: number;
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug_report: "Bug report",
  feature_request: "Feature request",
  general: "General feedback",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  actioned: "Actioned",
};
