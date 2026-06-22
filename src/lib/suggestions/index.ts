import type { SupabaseClient } from "@supabase/supabase-js";

import { getImportantEmailSuggestions } from "@/lib/email/important-emails-cache";
import { mapEmailSuggestionsToSmartSuggestions } from "@/lib/email/suggestion-mapper";
import { hasPackageAccess } from "@/lib/billing/access";
import { buildSuggestionContext } from "@/lib/suggestions/context";
import { generateSuggestions } from "@/lib/suggestions/rules";
import type { SmartSuggestion, SuggestionPriority } from "@/lib/suggestions/types";

const PRIORITY_RANK: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
  return [...suggestions].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    if (a.actionHref && !b.actionHref) return -1;
    if (!a.actionHref && b.actionHref) return 1;
    return 0;
  });
}

export async function buildSuggestions(
  userId: string,
  supabase: SupabaseClient
): Promise<SmartSuggestion[]> {
  const context = await buildSuggestionContext(userId, supabase);
  const ruleSuggestions = generateSuggestions(context);

  const hasAiPro = await hasPackageAccess(userId, "ai_pro", supabase);
  let emailSuggestions: SmartSuggestion[] = [];

  if (hasAiPro) {
    try {
      const importantEmails = await getImportantEmailSuggestions(userId);
      emailSuggestions = mapEmailSuggestionsToSmartSuggestions(importantEmails);
    } catch (error) {
      console.error("buildSuggestions: email suggestions failed", error);
    }
  }

  return sortSuggestions([...ruleSuggestions, ...emailSuggestions]).slice(0, 6);
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
