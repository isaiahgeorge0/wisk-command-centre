import type { EmailActionItem } from "@/lib/email/types";
import { fingerprintActionItemEmails } from "@/lib/email/action-items-fingerprint";
import { createAdminClient } from "@/lib/supabase/admin";

export { fingerprintActionItemEmails };

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const EMAIL_ACTION_ITEMS_CACHE_KEY = "email_action_items";

export type EmailActionItemsCache = {
  fingerprint: string;
  items: EmailActionItem[];
  generated_at: string;
};

export async function readActionItemsCache(
  userId: string
): Promise<EmailActionItemsCache | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_context_cache")
    .select("context")
    .eq("user_id", userId)
    .maybeSingle();

  const context = data?.context as Record<string, unknown> | null;
  const cache = context?.[EMAIL_ACTION_ITEMS_CACHE_KEY] as
    | EmailActionItemsCache
    | undefined;
  return cache ?? null;
}

export async function writeActionItemsCache(
  userId: string,
  fingerprint: string,
  items: EmailActionItem[]
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_context_cache")
    .select("context, generated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const existingContext =
    data?.context &&
    typeof data.context === "object" &&
    !Array.isArray(data.context)
      ? (data.context as Record<string, unknown>)
      : {};

  await admin.from("ai_context_cache").upsert({
    user_id: userId,
    context: {
      ...existingContext,
      [EMAIL_ACTION_ITEMS_CACHE_KEY]: {
        fingerprint,
        items,
        generated_at: new Date().toISOString(),
      } satisfies EmailActionItemsCache,
    },
    // Preserve outer generated_at so Winston chat context TTL is not reset.
    generated_at: (data?.generated_at as string) ?? new Date().toISOString(),
  });
}

export function isActionItemsCacheFresh(
  cache: EmailActionItemsCache,
  fingerprint: string
): boolean {
  if (cache.fingerprint !== fingerprint) return false;
  const age = Date.now() - new Date(cache.generated_at).getTime();
  return age >= 0 && age < CACHE_TTL_MS;
}
