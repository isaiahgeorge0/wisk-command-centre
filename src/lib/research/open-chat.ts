import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import {
  clampCitedClaims,
  formatCitationsBlock,
  type ResearchCitation,
  type ResearchCitedClaim,
} from "@/lib/research/citations";
import { routeAndSearchResearchTools } from "@/lib/research/tool-routing";

const openChatOutputSchema = z.object({
  answer: z.string().trim().min(1),
  claims: z.array(
    z.object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
  ),
});

export type ResearchOpenChatAnswer = {
  answer: string;
  claims: ResearchCitedClaim[];
  citations: ResearchCitation[];
  /** Formatted assistant message for conversation persistence / SSE. */
  displayMessage: string;
};

function formatDisplayMessage(
  answer: string,
  claims: ResearchCitedClaim[],
  citations: ResearchCitation[]
): string {
  const claimLines =
    claims.length > 0
      ? claims
          .map((claim) => `- ${claim.text} [${claim.citationIndex}]`)
          .join("\n")
      : null;

  const sourceLines = citations
    .map(
      (citation, index) =>
        `[${index}] ${citation.title} — ${citation.url}`
    )
    .join("\n");

  const parts = [answer.trim()];
  if (claimLines) {
    parts.push(`Key points:\n${claimLines}`);
  }
  if (sourceLines) {
    parts.push(`Sources:\n${sourceLines}`);
  }
  return parts.join("\n\n");
}

/**
 * Open-ended Research Pro chat turn: shared tool routing + citation drop discipline.
 */
export async function answerOpenResearchQuestion(input: {
  userId: string;
  question: string;
  conversationContext?: string;
}): Promise<ResearchOpenChatAnswer> {
  const contextBlock = input.conversationContext?.trim()
    ? `\n\nRecent conversation:\n${input.conversationContext.trim()}`
    : "";

  const routed = await routeAndSearchResearchTools({
    userId: input.userId,
    usageFeature: "research_open_chat",
    routingUserPrompt: `User research question:
${input.question}${contextBlock}

Decide the best search plan to answer with cited market/competitor/business evidence.`,
    fallbackTavilyQuery: input.question,
    fallbackExaQuery: input.question,
  });

  if (routed.citations.length === 0) {
    throw new Error("No research sources were found for this question.");
  }

  const synthesisSystem = cachedSystemParts([
    {
      text: `You are Winston answering an open research question with citations.
Return ONLY valid JSON:
{
  "answer": "2-5 sentence synthesis",
  "claims": [{ "text": "factual claim", "citationIndex": 0 }]
}
Rules:
- Every claim must cite exactly one source index from the provided source list.
- No claim without citation.
- Do not invent facts; use only the sources.
- The answer prose must not assert standalone figures that are not backed by a cited claim.
- Prefer qualitative phrasing over inventing numbers.
- If evidence is weak, say so in the answer and return fewer claims.
- Do not include markdown fences.`,
      cache: true,
    },
  ]);

  const synthesisPrompt = `Question:
${input.question}${contextBlock}

Sources:
${formatCitationsBlock(routed.citations)}

Generate the research answer JSON now.`;

  const synthesisResponse = await callAnthropicJson({
    system: synthesisSystem,
    userPrompt: synthesisPrompt,
    maxTokens: 1000,
  });

  await logUsage(
    input.userId,
    "research_open_chat",
    synthesisResponse.usage.input,
    synthesisResponse.usage.output
  );

  const synthesis = openChatOutputSchema.parse(
    JSON.parse(synthesisResponse.jsonText)
  );

  const claims = clampCitedClaims(synthesis.claims, routed.citations.length);

  return {
    answer: synthesis.answer,
    claims,
    citations: routed.citations,
    displayMessage: formatDisplayMessage(
      synthesis.answer,
      claims,
      routed.citations
    ),
  };
}
