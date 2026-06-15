export type WiskPackage =
  | "ai"
  | "ai_pro"
  | "social"
  | "commerce"
  | "properties"
  | "max";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelled"
  | "past_due";

export type UserSubscriptionRow = {
  id: string;
  user_id: string;
  package: WiskPackage;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingPlan = "free" | "ai" | "ai_pro" | "max";
