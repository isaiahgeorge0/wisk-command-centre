import { z } from "zod";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import { logUsage } from "@/lib/ai/usage-logger";
import {
  createProposalTempId,
  normalizeGeneratedProposalItems,
  type WinstonProposal,
} from "@/lib/winston/proposal";
import type { ResearchSignal } from "@/lib/research/types";

const contentItemSchema = z.object({
  tempId: z.string().min(1).optional(),
  entityType: z.literal("content_post"),
  fields: z.record(z.string(), z.unknown()),
  reasoning: z.string().trim().min(1),
  selected: z.boolean().optional(),
});

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1).optional(),
  foundActionableItems: z.boolean(),
  noActionableReason: z.string().trim().optional(),
  items: z.array(contentItemSchema).max(8).optional(),
});

const SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant.
Turn one competitor watchlist signal into a reviewable content_post proposal — never invent filler.

Return ONLY valid JSON:
{
  "summary": "optional short sentence",
  "foundActionableItems": true|false,
  "noActionableReason": "required when foundActionableItems is false",
  "items": [
    {
      "tempId": "tmp-any-string",
      "entityType": "content_post",
      "fields": {
        "title": "string",
        "platforms": ["TikTok"|"Instagram"|"YouTube"|"LinkedIn"|"Twitter/X"|"Facebook"|"Other"],
        "content_type": "Video"|"Reel"|"Short"|"Post"|"Story"|"Article"|"Thread"|"Other",
        "status": "idea",
        "description": "optional",
        "hook": "optional",
        "tags": "optional comma-separated"
      },
      "reasoning": "specific signal from the competitor change",
      "selected": true
    }
  ]
}

Rules:
- entityType must be content_post only.
- Prefer status "idea" with no scheduled_date unless the signal clearly implies timing.
- Ground every item in the competitor change. If there is no honest content angle, set foundActionableItems=false.
- Number guardrail: never invent, round, abbreviate, convert, or recalculate figures. If you mention a number that appears in the signal text, copy it character-for-character from that text. Prefer qualitative angles when unsure.
- selected must be true. JSON only.`;

export function buildCompetitorSignalProposalPrompt(signal: ResearchSignal): string {
  return `Competitor: ${signal.competitorName}
Source: ${signal.source}
Urgency: ${signal.urgency}
Checked at: ${signal.checkedAt}
Change summary: ${signal.summary}
${signal.detail ? `Detail: ${signal.detail}` : ""}

Propose content angles the user can review before anything is created.`;
}

export async function proposeContentFromCompetitorSignal(input: {
  userId: string;
  signal: ResearchSignal;
}): Promise<
  | { found: true; summary: string | null; proposal: WinstonProposal }
  | { found: false; message: string }
> {
  const { jsonText, usage } = await callAnthropicJson({
    system: cachedSystemPrompt(SYSTEM_PROMPT),
    userPrompt: buildCompetitorSignalProposalPrompt(input.signal),
    maxTokens: 2048,
  });

  await logUsage(input.userId, "chat", usage.input, usage.output);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    throw new Error("Winston returned an invalid proposal format");
  }

  const parsed = modelResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Winston returned an invalid proposal format");
  }

  if (!parsed.data.foundActionableItems || !(parsed.data.items?.length ?? 0)) {
    return {
      found: false,
      message:
        parsed.data.noActionableReason?.trim() ||
        "No clear content angle from this signal yet.",
    };
  }

  const items = normalizeGeneratedProposalItems(parsed.data.items ?? []);
  if (items.length === 0) {
    return {
      found: false,
      message:
        parsed.data.noActionableReason?.trim() ||
        "No clear content angle from this signal yet.",
    };
  }

  return {
    found: true,
    summary: parsed.data.summary?.trim() || null,
    proposal: {
      proposalId: createProposalTempId(),
      sourceType: "conversation",
      sourceId: input.signal.checkId,
      items,
    },
  };
}
