import type { ImportantEmailSuggestion } from "@/lib/email/important-emails-cache";
import type { SmartSuggestion } from "@/lib/suggestions/types";

function truncateTitle(fromName: string, subject: string): string {
  const title = `${fromName}: ${subject}`;
  if (title.length <= 50) return title;
  return `${title.slice(0, 47)}...`;
}

export function mapEmailSuggestionsToSmartSuggestions(
  suggestions: ImportantEmailSuggestion[]
): SmartSuggestion[] {
  return suggestions.map((suggestion) => ({
    id: `email-important-${suggestion.emailId}`,
    category: "email" as const,
    priority: suggestion.linkedLeadId ? ("high" as const) : ("medium" as const),
    title: truncateTitle(suggestion.fromName, suggestion.subject),
    description: suggestion.reason,
    actionLabel: "Open email",
    actionHref: "/email",
    icon: "Mail",
    accentColour: "text-sky-500",
    referenceId: suggestion.emailId,
  }));
}
