export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type MonthlyUsage = {
  chatTokens: number;
  digestTokens: number;
  total: number;
  limit: number;
  percentage: number;
  resetDate: string;
};

export type AIConversation = {
  id: string;
  user_id: string;
  title: string;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveProject = {
  id: string;
  project_name: string;
};
