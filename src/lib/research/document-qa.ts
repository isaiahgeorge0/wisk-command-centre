import { cachedSystemParts } from "@/lib/ai/anthropic";
import {
  ANTHROPIC_TIMEOUT_MS,
  WINSTON_PAID_CHAT_MODEL,
} from "@/lib/ai/constants";
import { logUsage } from "@/lib/ai/usage-logger";
import { formatResearchDocumentContext } from "@/lib/research/document-analysis";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
  error?: { message?: string };
};

const DOCUMENT_QA_SYSTEM = `You are Winston answering follow-up questions about one uploaded Research document.
Ground every answer only in the document text provided. Do not use outside knowledge or invent facts.
Number guardrail: any figure you restate must appear character-for-character in the document. Never infer, round, or recalculate numbers.
Be concise and plain. If the document does not contain the answer, say so clearly.`;

/**
 * Follow-up Q&A grounded in one document's extracted text. Anthropic only.
 */
export async function answerResearchDocumentQuestion(input: {
  userId: string;
  documentName: string;
  extractedText: string;
  question: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ answer: string; usage: { input: number; output: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const system = cachedSystemParts([
    { text: DOCUMENT_QA_SYSTEM, cache: true },
    {
      text: formatResearchDocumentContext(
        input.documentName,
        input.extractedText
      ),
      cache: true,
      ttl: "5m",
    },
  ]);

  const messages = [
    ...input.history.slice(-12).map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    { role: "user" as const, content: input.question },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: WINSTON_PAID_CHAT_MODEL,
      max_tokens: 1200,
      system,
      messages,
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  const data = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic request failed");
  }

  const answer = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Winston returned an empty answer.");
  }

  const usage = {
    input: data.usage?.input_tokens ?? 0,
    output: data.usage?.output_tokens ?? 0,
  };

  await logUsage(
    input.userId,
    "research_document_analysis",
    usage.input,
    usage.output
  );

  return { answer, usage };
}
