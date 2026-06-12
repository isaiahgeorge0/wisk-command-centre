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
