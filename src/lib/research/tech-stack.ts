import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import {
  clampCitedClaims,
  formatCitationsBlock,
  type ResearchCitation,
} from "@/lib/research/citations";
import { routeAndSearchResearchTools } from "@/lib/research/tool-routing";
import type {
  ResearchCompetitor,
  ResearchCompetitorTechStack,
  ResearchTechStackTool,
} from "@/lib/research/types";

const techStackOutputSchema = z.object({
  tools: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(120),
        citationIndex: z.number().int().nonnegative(),
      })
    )
    .max(8)
    .optional(),
});

function competitorSearchLabel(competitor: ResearchCompetitor): string {
  const parts = [competitor.name];
  if (competitor.url?.trim()) parts.push(competitor.url.trim());
  return parts.join(" ");
}

/**
 * Infer likely tools/platforms for a tracked competitor via Tavily/Exa
 * public signals (not HTML scraping). Returns citation-backed tools only.
 */
export async function detectCompetitorTechStack(input: {
  userId: string;
  competitor: ResearchCompetitor;
}): Promise<ResearchCompetitorTechStack> {
  const label = competitorSearchLabel(input.competitor);
  const checkedAt = new Date().toISOString();

  const routed = await routeAndSearchResearchTools({
    userId: input.userId,
    usageFeature: "research_tech_stack_detection",
    routingUserPrompt: `Competitor: ${label}

Decide the best search plan to infer which tools and platforms this company likely runs on (CMS/ecommerce, CRM/marketing, analytics, hiring stack mentions, etc.). Prefer public signals: site/platform mentions, job listings naming tools, press or review write-ups about their stack. Do not invent tools.`,
    fallbackTavilyQuery: `${input.competitor.name} tech stack OR platform OR "built with" OR HubSpot OR Shopify OR Salesforce OR WordPress`,
    fallbackExaQuery: `${input.competitor.name} company software tools CRM CMS platform job listing`,
    maxResults: 5,
  });

  const citations: ResearchCitation[] = routed.citations;

  if (citations.length === 0) {
    return { tools: [], citations: [], checkedAt };
  }

  const synthesisSystem = cachedSystemParts([
    {
      text: `You are Winston inferring a competitor's likely tech stack from public search sources.
Return ONLY valid JSON:
{
  "tools": [{ "text": "short claim, e.g. Appears to run on Shopify", "citationIndex": 0 }]
}
Rules:
- Each tool claim must cite exactly one source index from the provided source list.
- No claim without a citation.
- Keep each claim short (under ~12 words) and specific.
- Only include tools/platforms with clear public evidence in the sources.
- Prefer platform names (Shopify, HubSpot, Salesforce, WordPress, etc.) when evidenced.
- If evidence is weak or absent, return { "tools": [] }.
- Do not invent or guess. Do not include markdown.`,
      cache: true,
    },
  ]);

  const synthesisPrompt = `Competitor: ${input.competitor.name}
Website: ${input.competitor.url?.trim() || "unknown"}

Sources:
${formatCitationsBlock(citations)}

Infer the likely tech stack as citation-backed tool claims now.`;

  const synthesisResponse = await callAnthropicJson({
    system: synthesisSystem,
    userPrompt: synthesisPrompt,
    maxTokens: 600,
  });

  await logUsage(
    input.userId,
    "research_tech_stack_detection",
    synthesisResponse.usage.input,
    synthesisResponse.usage.output
  );

  const parsed = techStackOutputSchema.parse(
    JSON.parse(synthesisResponse.jsonText)
  );

  const tools: ResearchTechStackTool[] = clampCitedClaims(
    parsed.tools ?? [],
    citations.length
  ).slice(0, 8);

  return {
    tools,
    citations,
    checkedAt,
  };
}
