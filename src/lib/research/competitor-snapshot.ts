import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import {
  clampCitedClaims,
  formatCitationsBlock,
  truncateSnippet,
  type ResearchCitation,
} from "@/lib/research/citations";
import { routeAndSearchResearchTools } from "@/lib/research/tool-routing";
import type {
  ResearchCompetitor,
  ResearchCompetitorCheck,
  ResearchCompetitorSnapshot,
  ResearchCompetitorSnapshotClaim,
  ResearchCompetitorSnapshotMove,
} from "@/lib/research/types";

const snapshotSynthesisSchema = z.object({
  pricingPositioning: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(220),
        citationIndex: z.number().int().nonnegative(),
      })
    )
    .max(6)
    .optional(),
  recentMoves: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(220),
        citationIndex: z.number().int().nonnegative(),
      })
    )
    .max(8)
    .optional(),
});

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function competitorSearchLabel(competitor: ResearchCompetitor): string {
  const parts = [competitor.name];
  if (competitor.url?.trim()) parts.push(competitor.url.trim());
  return parts.join(" ");
}

/**
 * Turn stored competitor-check snapshots into citation rows so claims can
 * keep pointing at the original public URLs the cron already collected.
 */
export function citationsFromCompetitorChecks(
  checks: ResearchCompetitorCheck[]
): ResearchCitation[] {
  const citations: ResearchCitation[] = [];
  const seen = new Set<string>();

  for (const check of checks) {
    const snapshot = check.snapshot ?? {};

    if (check.source === "tavily") {
      const urls = asStringArray(snapshot.urls);
      const titles = asStringArray(snapshot.titles);
      urls.forEach((url, index) => {
        const key = url.toLowerCase();
        if (!url || seen.has(key)) return;
        seen.add(key);
        citations.push({
          title: titles[index]?.trim() || url,
          url,
          publisher: "Web",
          snippet: truncateSnippet(
            check.change_summary?.trim() || titles[index] || url
          ),
        });
      });
      continue;
    }

    const websiteUri =
      typeof snapshot.websiteUri === "string" ? snapshot.websiteUri.trim() : "";
    const displayName =
      typeof snapshot.displayName === "string"
        ? snapshot.displayName.trim()
        : "";
    const reviewSnippet =
      typeof snapshot.latestReviewSnippet === "string"
        ? snapshot.latestReviewSnippet.trim()
        : "";
    const url =
      websiteUri ||
      (typeof snapshot.placeId === "string" && snapshot.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${snapshot.placeId}`
        : "");
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      title: displayName || "Map listing",
      url,
      publisher: "Map listing",
      snippet: truncateSnippet(
        reviewSnippet || check.change_summary?.trim() || displayName || url
      ),
    });
  }

  return citations.slice(0, 12);
}

function citationIndexForCheck(
  check: ResearchCompetitorCheck,
  citations: ResearchCitation[]
): number | null {
  const snapshot = check.snapshot ?? {};
  const candidateUrls: string[] = [];

  if (check.source === "tavily") {
    candidateUrls.push(...asStringArray(snapshot.urls));
  } else {
    if (typeof snapshot.websiteUri === "string" && snapshot.websiteUri.trim()) {
      candidateUrls.push(snapshot.websiteUri.trim());
    }
    if (typeof snapshot.placeId === "string" && snapshot.placeId) {
      candidateUrls.push(
        `https://www.google.com/maps/place/?q=place_id:${snapshot.placeId}`
      );
    }
  }

  for (const url of candidateUrls) {
    const index = citations.findIndex(
      (citation) => citation.url.toLowerCase() === url.toLowerCase()
    );
    if (index >= 0) return index;
  }

  return citations.length > 0 ? 0 : null;
}

/** Timeline rows from meaningful cron signals — keep the original summary text. */
export function timelineMovesFromChecks(
  checks: ResearchCompetitorCheck[],
  citations: ResearchCitation[]
): ResearchCompetitorSnapshotMove[] {
  const moves: ResearchCompetitorSnapshotMove[] = [];

  for (const check of checks) {
    if (!check.has_meaningful_change || !check.change_summary?.trim()) continue;
    const citationIndex = citationIndexForCheck(check, citations);
    if (citationIndex == null) continue;
    moves.push({
      text: check.change_summary.trim(),
      citationIndex,
      at: check.checked_at,
    });
    if (moves.length >= 8) break;
  }

  return clampCitedClaims(moves, citations.length);
}

function emptySnapshot(input: {
  generatedAt: string;
  source: ResearchCompetitorSnapshot["source"];
  emptyReason: string;
}): ResearchCompetitorSnapshot {
  return {
    pricingPositioning: [],
    recentMoves: [],
    citations: [],
    generatedAt: input.generatedAt,
    source: input.source,
    emptyReason: input.emptyReason,
  };
}

async function synthesisePricingAndOptionalMoves(input: {
  userId: string;
  competitor: ResearchCompetitor;
  citations: ResearchCitation[];
  includeRecentMoves: boolean;
  signalContext?: string;
}): Promise<{
  pricingPositioning: ResearchCompetitorSnapshotClaim[];
  recentMoves: ResearchCompetitorSnapshotClaim[];
}> {
  if (input.citations.length === 0) {
    return { pricingPositioning: [], recentMoves: [] };
  }

  const movesRule = input.includeRecentMoves
    ? `- recentMoves: short public moves (launches, pricing shifts, review spikes) with citations.
- If evidence is thin, return empty arrays rather than guessing.`
    : `- recentMoves: always return [] (timeline is supplied separately from stored signals).
- Focus only on pricingPositioning.`;

  const synthesisSystem = cachedSystemParts([
    {
      text: `You are Winston building a competitor snapshot from public sources.
Return ONLY valid JSON:
{
  "pricingPositioning": [{ "text": "short observation", "citationIndex": 0 }],
  "recentMoves": [{ "text": "short move", "citationIndex": 0 }]
}
Rules:
- Every claim must cite exactly one source index from the provided list.
- No claim without a citation. Do not invent.
- Keep each claim under ~25 words.
- pricingPositioning: how they appear to price/position publicly (packages, market stance, offer style).
${movesRule}
- Do not include markdown.`,
      cache: true,
    },
  ]);

  const synthesisPrompt = `Competitor: ${input.competitor.name}
Website: ${input.competitor.url?.trim() || "unknown"}

${input.signalContext ? `Stored signal notes:\n${input.signalContext}\n\n` : ""}Sources:
${formatCitationsBlock(input.citations)}

Build the snapshot claims now.`;

  const synthesisResponse = await callAnthropicJson({
    system: synthesisSystem,
    userPrompt: synthesisPrompt,
    maxTokens: 900,
  });

  await logUsage(
    input.userId,
    "research_competitor_snapshot",
    synthesisResponse.usage.input,
    synthesisResponse.usage.output
  );

  const parsed = snapshotSynthesisSchema.parse(
    JSON.parse(synthesisResponse.jsonText)
  );

  return {
    pricingPositioning: clampCitedClaims(
      parsed.pricingPositioning ?? [],
      input.citations.length
    ).slice(0, 6),
    recentMoves: input.includeRecentMoves
      ? clampCitedClaims(
          parsed.recentMoves ?? [],
          input.citations.length
        ).slice(0, 8)
      : [],
  };
}

function latestCheckAt(checks: ResearchCompetitorCheck[]): string | null {
  if (checks.length === 0) return null;
  return checks.reduce((latest, check) =>
    check.checked_at > latest ? check.checked_at : latest
  , checks[0].checked_at);
}

/**
 * Build or reuse a competitor snapshot.
 * - auto: prefer stored signal history (no vendor search); seed via
 *   routeAndSearchResearchTools only when history has no citable sources.
 * - refresh: always run a fresh seed search (manual "Refresh now").
 */
export async function buildCompetitorSnapshot(input: {
  userId: string;
  competitor: ResearchCompetitor;
  checks: ResearchCompetitorCheck[];
  mode: "auto" | "refresh";
  cached?: ResearchCompetitorSnapshot | null;
}): Promise<ResearchCompetitorSnapshot> {
  const generatedAt = new Date().toISOString();
  const orderedChecks = [...input.checks].sort((a, b) =>
    a.checked_at < b.checked_at ? 1 : -1
  );

  if (input.mode === "auto" && input.cached) {
    const newestCheck = latestCheckAt(orderedChecks);
    if (
      !newestCheck ||
      newestCheck <= input.cached.generatedAt
    ) {
      return input.cached;
    }
  }

  const historyCitations = citationsFromCompetitorChecks(orderedChecks);
  const historyMoves = timelineMovesFromChecks(orderedChecks, historyCitations);

  if (input.mode === "auto" && historyCitations.length > 0) {
    const signalContext = orderedChecks
      .filter((check) => check.change_summary?.trim())
      .slice(0, 12)
      .map(
        (check) =>
          `- [${check.checked_at.slice(0, 10)}] ${check.source}: ${check.change_summary}`
      )
      .join("\n");

    const synthesised = await synthesisePricingAndOptionalMoves({
      userId: input.userId,
      competitor: input.competitor,
      citations: historyCitations,
      includeRecentMoves: historyMoves.length === 0,
      signalContext: signalContext || undefined,
    });

    const recentMoves: ResearchCompetitorSnapshotMove[] =
      historyMoves.length > 0
        ? historyMoves
        : synthesised.recentMoves.map((move) => ({
            ...move,
            at: null,
          }));

    if (
      synthesised.pricingPositioning.length === 0 &&
      recentMoves.length === 0
    ) {
      return emptySnapshot({
        generatedAt,
        source: "signal_history",
        emptyReason:
          "Signal history is present, but nothing clear enough for a snapshot yet.",
      });
    }

    return {
      pricingPositioning: synthesised.pricingPositioning,
      recentMoves,
      citations: historyCitations,
      generatedAt,
      source: "signal_history",
      emptyReason: null,
    };
  }

  const label = competitorSearchLabel(input.competitor);
  const routed = await routeAndSearchResearchTools({
    userId: input.userId,
    usageFeature: "research_competitor_snapshot",
    routingUserPrompt: `Competitor: ${label}

Decide the best search plan for a short competitor snapshot: public pricing/positioning and recent moves (launches, pricing changes, review activity). Prefer current public web signals.`,
    fallbackTavilyQuery: `${input.competitor.name} pricing OR plans OR "starting at" OR reviews OR launch`,
    fallbackExaQuery: `${input.competitor.name} company pricing positioning product launch`,
    maxResults: 5,
  });

  const citations = routed.citations;
  const source: ResearchCompetitorSnapshot["source"] =
    input.mode === "refresh" ? "refresh" : "seed_search";

  if (citations.length === 0) {
    return emptySnapshot({
      generatedAt,
      source,
      emptyReason:
        "No public signals found yet for this competitor. Daily watchlist checks will keep looking.",
    });
  }

  const synthesised = await synthesisePricingAndOptionalMoves({
    userId: input.userId,
    competitor: input.competitor,
    citations,
    includeRecentMoves: true,
  });

  if (
    synthesised.pricingPositioning.length === 0 &&
    synthesised.recentMoves.length === 0
  ) {
    return emptySnapshot({
      generatedAt,
      source,
      emptyReason:
        "Search ran, but nothing clear enough for a snapshot yet.",
    });
  }

  return {
    pricingPositioning: synthesised.pricingPositioning,
    recentMoves: synthesised.recentMoves.map((move) => ({
      ...move,
      at: null,
    })),
    citations,
    generatedAt,
    source,
    emptyReason: null,
  };
}
