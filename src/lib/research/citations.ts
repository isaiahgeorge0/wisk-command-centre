import type {
  LeadResearchCitation,
  LeadResearchClaim,
} from "@/lib/leads/types";
import type { ExaSearchResult } from "@/lib/research/exa";
import type { TavilySearchResult } from "@/lib/research/tavily";

export type ResearchCitation = LeadResearchCitation;
export type ResearchCitedClaim = LeadResearchClaim;

export function truncateSnippet(text: string, max = 260): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function buildCitationsFromSearch(input: {
  tavilyResults: TavilySearchResult[];
  exaResults: ExaSearchResult[];
  maxCitations?: number;
}): ResearchCitation[] {
  return [
    ...input.tavilyResults.map((result) => ({
      title: result.title,
      url: result.url,
      publisher: "Web",
      snippet: truncateSnippet(result.content),
    })),
    ...input.exaResults.map((result) => ({
      title: result.title,
      url: result.url,
      publisher: "Company source",
      snippet: truncateSnippet(result.text),
    })),
  ].slice(0, input.maxCitations ?? 10);
}

/** Drop claims whose citationIndex is out of range — same discipline as lead briefs. */
export function clampCitedClaims<T extends ResearchCitedClaim>(
  claims: T[],
  citationCount: number
): T[] {
  return claims.filter(
    (claim) =>
      claim.citationIndex >= 0 && claim.citationIndex < citationCount
  );
}

export function formatCitationsBlock(citations: ResearchCitation[]): string {
  return citations
    .map(
      (citation, index) =>
        `[${index}] ${citation.title} | ${citation.url}\nSnippet: ${citation.snippet}`
    )
    .join("\n\n");
}

/**
 * Pull the trailing "Sources:" block from a Research open-chat display message
 * so citations survive into the proposal review step.
 */
export function extractSourcesFromDisplayMessage(
  content: string
): string | null {
  const match = content.match(/(?:^|\n)Sources:\s*\n([\s\S]+)$/i);
  const block = match?.[1]?.trim();
  return block || null;
}
