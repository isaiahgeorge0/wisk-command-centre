import { createAdminClient } from "@/lib/supabase/admin";

export type UsageFeature =
  | "chat"
  | "digest"
  | "email_draft"
  | "property_insights"
  | "email_picks_draft"
  | "pipeline_health"
  | "portal_triage"
  | "property_valuation"
  | "morning_briefing"
  | "lead_research_brief"
  | "research_competitor_check"
  | "research_place_lookup"
  | "research_open_chat";

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
      provider: "anthropic",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  } catch (err) {
    // Never let logging failure break the feature.
    console.error("logUsage failed:", err);
  }
}

export async function logExternalUsage(input: {
  userId: string;
  feature:
    | "lead_research_brief"
    | "research_competitor_check"
    | "research_place_lookup"
    | "research_open_chat";
  provider: "tavily" | "exa" | "google_places";
  callCount?: number;
  estimatedCostUSD?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_log").insert({
      user_id: input.userId,
      feature: input.feature,
      provider: input.provider,
      input_tokens: 0,
      output_tokens: 0,
      external_call_count: input.callCount ?? 1,
      external_cost_usd: input.estimatedCostUSD ?? 0,
      external_metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("logExternalUsage failed:", err);
  }
}
