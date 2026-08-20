import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logExternalUsage, logUsage, type UsageFeature } from "@/lib/ai/usage-logger";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import {
  buildCitationsFromSearch,
  type ResearchCitation,
} from "@/lib/research/citations";
import { searchExa } from "@/lib/research/exa";
import {
  searchTavily,
  type TavilySearchDepth,
} from "@/lib/research/tavily";

const tavilySearchDepthSchema = z.enum(["basic", "advanced"]);

export const researchToolRoutingSchema = z.object({
  useTavily: z.boolean(),
  useExa: z.boolean(),
  tavilyQuery: z.string().trim().min(3).optional(),
  exaQuery: z.string().trim().min(3).optional(),
  tavilyDepth: tavilySearchDepthSchema.optional(),
});

export type ResearchToolRouting = z.infer<typeof researchToolRoutingSchema>;

export type ResearchToolRouteResult = {
  routing: ResearchToolRouting;
  useTavily: boolean;
  useExa: boolean;
  tavilyDepth: TavilySearchDepth;
  citations: ResearchCitation[];
  usage: { input: number; output: number };
};

const ROUTING_SYSTEM = cachedSystemParts([
  {
    text: `You are Winston routing research tools.
Return ONLY valid JSON:
{
  "useTavily": true|false,
  "useExa": true|false,
  "tavilyQuery": "string when useTavily=true",
  "exaQuery": "string when useExa=true",
  "tavilyDepth": "basic|advanced"
}
Rules:
- Tavily is better for real-time/news/current web signals and pricing/review mentions.
- Exa is better for company/people background.
- Use one or both tools based on evidence needs.
- If uncertain, use both.
- Do not include commentary.`,
    cache: true,
  },
]);

/**
 * Shared Claude tool-routing used by lead intelligence briefs and open research chat.
 * Ensures Tavily/Exa selection logic is not duplicated per surface.
 */
export async function routeAndSearchResearchTools(input: {
  userId: string;
  usageFeature: Extract<
    UsageFeature,
    | "lead_research_brief"
    | "research_open_chat"
    | "lead_auto_enrichment"
    | "research_tech_stack_detection"
    | "research_competitor_snapshot"
  >;
  routingUserPrompt: string;
  fallbackTavilyQuery: string;
  fallbackExaQuery: string;
  maxResults?: number;
}): Promise<ResearchToolRouteResult> {
  const routingResponse = await callAnthropicJson({
    system: ROUTING_SYSTEM,
    userPrompt: input.routingUserPrompt,
    maxTokens: 220,
  });

  const routingParsed = researchToolRoutingSchema.parse(
    JSON.parse(routingResponse.jsonText)
  );

  await logUsage(
    input.userId,
    input.usageFeature,
    routingResponse.usage.input,
    routingResponse.usage.output
  );

  // If Claude picks only one tool, keep that choice; if both false, force both.
  const neither = !routingParsed.useTavily && !routingParsed.useExa;
  const useTavily = routingParsed.useTavily || neither;
  const useExa = routingParsed.useExa || neither;
  const tavilyDepth: TavilySearchDepth = routingParsed.tavilyDepth ?? "basic";
  const maxResults = input.maxResults ?? 5;

  const [tavilyResults, exaResults] = await Promise.all([
    useTavily
      ? searchTavily({
          query: routingParsed.tavilyQuery ?? input.fallbackTavilyQuery,
          searchDepth: tavilyDepth,
          maxResults,
        })
      : Promise.resolve([]),
    useExa
      ? searchExa({
          query: routingParsed.exaQuery ?? input.fallbackExaQuery,
          numResults: maxResults,
        })
      : Promise.resolve([]),
  ]);

  if (useTavily) {
    await logExternalUsage({
      userId: input.userId,
      feature: input.usageFeature,
      provider: "tavily",
      callCount: 1,
      estimatedCostUSD: tavilyDepth === "advanced" ? 0.016 : 0.008,
      metadata: { depth: tavilyDepth, resultCount: tavilyResults.length },
    });
  }
  if (useExa) {
    await logExternalUsage({
      userId: input.userId,
      feature: input.usageFeature,
      provider: "exa",
      callCount: 1,
      estimatedCostUSD: 0.007,
      metadata: { resultCount: exaResults.length },
    });
  }

  return {
    routing: routingParsed,
    useTavily,
    useExa,
    tavilyDepth,
    citations: buildCitationsFromSearch({ tavilyResults, exaResults }),
    usage: routingResponse.usage,
  };
}
