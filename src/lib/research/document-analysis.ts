import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import { RESEARCH_DOCUMENT_EXTRACT_MAX_CHARS } from "@/lib/research/document-extract";

const summarySchema = z.object({
  summary: z.string().trim().min(1),
});

const DOC_PROMPT_MAX_CHARS = Math.min(80_000, RESEARCH_DOCUMENT_EXTRACT_MAX_CHARS);

export function clipDocumentTextForPrompt(text: string): string {
  if (text.length <= DOC_PROMPT_MAX_CHARS) return text;
  return `${text.slice(0, DOC_PROMPT_MAX_CHARS)}…`;
}

export function formatResearchDocumentContext(
  name: string,
  extractedText: string
): string {
  const clipped = clipDocumentTextForPrompt(extractedText);
  return `Document name: ${name}
Document text (source of truth — ground every answer only in this text):
${clipped}`;
}

/**
 * Single Claude call: summarise extracted document text. No Tavily/Exa.
 */
export async function summariseResearchDocument(input: {
  userId: string;
  documentName: string;
  extractedText: string;
}): Promise<{ summary: string; usage: { input: number; output: number } }> {
  const system = cachedSystemParts([
    {
      text: `You are Winston summarising a document the user uploaded in WISK Research.
Return ONLY valid JSON:
{ "summary": "plain-language summary with key points and notable figures" }

Rules:
- Ground every claim in the document text. Do not invent facts.
- Number guardrail: any figure you restate must appear character-for-character in the document. Never infer, round, or recalculate numbers.
- Prefer short paragraphs and bullet-like lines inside the summary string (use newlines).
- Call out anything numeric or commercially notable (prices, dates, headcount, terms).
- No markdown fences. No commentary outside the JSON.`,
      cache: true,
    },
  ]);

  const response = await callAnthropicJson({
    system,
    userPrompt: `${formatResearchDocumentContext(
      input.documentName,
      input.extractedText
    )}

Produce the summary JSON now.`,
    maxTokens: 1200,
  });

  await logUsage(
    input.userId,
    "research_document_analysis",
    response.usage.input,
    response.usage.output
  );

  const parsed = summarySchema.parse(JSON.parse(response.jsonText));
  return { summary: parsed.summary, usage: response.usage };
}
