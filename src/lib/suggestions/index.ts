import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSuggestionContext } from "@/lib/suggestions/context";
import { generateSuggestions } from "@/lib/suggestions/rules";
import type { SmartSuggestion } from "@/lib/suggestions/types";

export async function buildSuggestions(
  userId: string,
  supabase: SupabaseClient
): Promise<SmartSuggestion[]> {
  const context = await buildSuggestionContext(userId, supabase);
  return generateSuggestions(context);
}

export { buildSuggestionContext } from "@/lib/suggestions/context";
export { generateSuggestions } from "@/lib/suggestions/rules";
export {
  mergeNotificationCandidates,
  suggestionsToNotificationCandidates,
} from "@/lib/suggestions/notifications";
export type {
  SmartSuggestion,
  SuggestionCategory,
  SuggestionPriority,
} from "@/lib/suggestions/types";
