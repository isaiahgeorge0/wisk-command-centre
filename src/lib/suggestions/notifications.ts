import type { NotificationCandidate } from "@/lib/notifications/types";
import type { SmartSuggestion } from "@/lib/suggestions/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Smart suggestions are live — rule-based contextual nudges on Overview + notifications. */

export function suggestionsToNotificationCandidates(
  suggestions: SmartSuggestion[],
  userId: string
): NotificationCandidate[] {
  return suggestions
    .filter(
      (suggestion) =>
        suggestion.priority === "high" && suggestion.notificationType
    )
    .map((suggestion) => ({
      type: suggestion.notificationType!,
      reference_id:
        suggestion.referenceId && UUID_PATTERN.test(suggestion.referenceId)
          ? suggestion.referenceId
          : userId,
      title: suggestion.title,
      message: suggestion.description,
      link_to: suggestion.actionHref ?? "/",
    }));
}

const OVERLAPPING_STANDARD_TYPES = new Set([
  "follow_up_overdue",
  "goal_no_progress",
  "deadline_approaching",
]);

/**
 * Remove standard notifications that duplicate a high-priority suggestion
 * for the same entity reference.
 */
export function filterOverlappingNotifications(
  standard: NotificationCandidate[],
  suggestions: NotificationCandidate[]
): NotificationCandidate[] {
  const suggestionRefs = new Set(
    suggestions.map((candidate) => candidate.reference_id)
  );

  return standard.filter((candidate) => {
    if (
      OVERLAPPING_STANDARD_TYPES.has(candidate.type) &&
      suggestionRefs.has(candidate.reference_id)
    ) {
      return false;
    }
    return true;
  });
}

export function mergeNotificationCandidates(
  standard: NotificationCandidate[],
  suggestions: NotificationCandidate[]
): NotificationCandidate[] {
  const filtered = filterOverlappingNotifications(standard, suggestions);
  return [...filtered, ...suggestions];
}
