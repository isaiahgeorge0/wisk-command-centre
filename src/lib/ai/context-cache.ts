import type { SupabaseClient } from "@supabase/supabase-js";

import { buildUserContext, type UserContext } from "@/lib/ai/context-builder";
import { EMAIL_ACTION_ITEMS_CACHE_KEY } from "@/lib/email/action-items-cache";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EMAIL_SUGGESTIONS_KEY = "email_suggestions";

/** Nested keys stored alongside UserContext in ai_context_cache.context. */
const PRESERVED_CONTEXT_KEYS = [
  EMAIL_SUGGESTIONS_KEY,
  EMAIL_ACTION_ITEMS_CACHE_KEY,
] as const;

function preserveNestedCaches(
  existingContext: unknown
): Record<string, unknown> | null {
  if (
    !existingContext ||
    typeof existingContext !== "object" ||
    Array.isArray(existingContext)
  ) {
    return null;
  }

  const source = existingContext as Record<string, unknown>;
  const preserved: Record<string, unknown> = {};
  for (const key of PRESERVED_CONTEXT_KEYS) {
    if (source[key] != null) {
      preserved[key] = source[key];
    }
  }

  return Object.keys(preserved).length > 0 ? preserved : null;
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
  const preserved = preserveNestedCaches(data?.context);

  const admin = createAdminClient();
  await admin.from("ai_context_cache").upsert({
    user_id: userId,
    context: preserved ? { ...context, ...preserved } : context,
    generated_at: new Date().toISOString(),
  });

  return context;
}
