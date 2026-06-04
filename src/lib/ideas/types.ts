export const IDEA_STATUSES = [
  "new",
  "exploring",
  "in-progress",
  "parked",
  "dropped",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export type Idea = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus | string | null;
  created_at: string;
};

export type IdeaFormInput = {
  title: string;
  description?: string;
  category?: string;
  status?: IdeaStatus;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
