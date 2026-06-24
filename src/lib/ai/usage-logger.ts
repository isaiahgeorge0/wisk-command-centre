import { createAdminClient } from "@/lib/supabase/admin";

export type UsageFeature =
  | "chat"
  | "digest"
  | "email_draft"
  | "property_insights"
  | "email_picks_draft"
  | "portal_triage"
  | "property_valuation";

export async function logUsage(
  userId: string,
  feature: UsageFeature,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_log").insert({
      user_id: userId,
      feature,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  } catch (err) {
    // Never let logging failure break the feature.
    console.error("logUsage failed:", err);
  }
}
