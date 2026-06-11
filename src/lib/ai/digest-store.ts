import { createAdminClient } from "@/lib/supabase/admin";
import type { DigestContent } from "@/lib/ai/digest-generator";

export async function storeDigest(
  userId: string,
  digest: DigestContent
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("ai_reports").insert({
    user_id: userId,
    report_type: "weekly_digest",
    content: JSON.stringify(digest),
    generated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store digest for user ${userId}: ${error.message}`);
  }
}
