import type { SupabaseClient } from "@supabase/supabase-js";

import { buildUserContext, type UserContext } from "@/lib/ai/context-builder";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EMAIL_SUGGESTIONS_KEY = "email_suggestions";

function preserveEmailSuggestions(
  existingContext: unknown
): Record<string, unknown> | null {
  if (
    !existingContext ||
    typeof existingContext !== "object" ||
    Array.isArray(existingContext)
  ) {
    return null;
  }

  const emailSuggestions = (existingContext as Record<string, unknown>)[
    EMAIL_SUGGESTIONS_KEY
  ];

  return emailSuggestions ? { [EMAIL_SUGGESTIONS_KEY]: emailSuggestions } : null;
}

export async function getCachedContext(
  userId: string,
  supabase: SupabaseClient
): Promise<UserContext> {
  const { data } = await supabase
    .from("ai_context_cache")
    .select("context, generated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const isStale =
    !data ||
    Date.now() - new Date(data.generated_at as string).getTime() > CACHE_TTL_MS;

  if (!isStale && data) {
    return data.context as UserContext;
  }

  const context = await buildUserContext(userId, supabase);
  const preserved = preserveEmailSuggestions(data?.context);

  const admin = createAdminClient();
  await admin.from("ai_context_cache").upsert({
    user_id: userId,
    context: preserved ? { ...context, ...preserved } : context,
    generated_at: new Date().toISOString(),
  });

  return context;
}
