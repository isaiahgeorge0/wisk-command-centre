import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan, UserSubscriptionRow } from "@/lib/billing/types";

const ACTIVE_STATUSES = ["active", "trialing"] as const;

export function resolveBillingPlan(
  subscriptions: Pick<UserSubscriptionRow, "package" | "status">[]
): BillingPlan {
  const active = subscriptions.filter((sub) =>
    ACTIVE_STATUSES.includes(sub.status as (typeof ACTIVE_STATUSES)[number])
  );

  if (active.some((sub) => sub.package === "max")) return "max";
  if (active.some((sub) => sub.package === "ai_pro")) return "ai_pro";
  if (active.some((sub) => sub.package === "ai")) return "ai";
  if (active.some((sub) => sub.package === "properties_pro")) return "properties_pro";
  if (active.some((sub) => sub.package === "properties")) return "properties";

  return "free";
}

export function getBillingPlanLabel(plan: BillingPlan): string {
  switch (plan) {
    case "ai":
      return "WISK AI";
    case "ai_pro":
      return "WISK AI Pro";
    case "max":
      return "WISK Max";
    default:
      return "Free";
  }
}

export async function getUserActiveSubscriptions(
  userId: string
): Promise<UserSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserActiveSubscriptions:", error.message);
    return [];
  }

  return (data ?? []) as UserSubscriptionRow[];
}

export async function getUserBillingSummary(userId: string) {
  const subscriptions = await getUserActiveSubscriptions(userId);
  const plan = resolveBillingPlan(subscriptions);

  const aiSubscription = subscriptions.find(
    (sub) => sub.package === "ai" || sub.package === "ai_pro" || sub.package === "max"
  );

  return {
    plan,
    planLabel: getBillingPlanLabel(plan),
    subscriptions,
    currentPeriodEnd: aiSubscription?.current_period_end ?? null,
  };
}
