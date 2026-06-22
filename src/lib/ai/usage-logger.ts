import { createAdminClient } from "@/lib/supabase/admin";

export async function logUsage(
  userId: string,
  feature: "chat" | "digest" | "email_draft",
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
