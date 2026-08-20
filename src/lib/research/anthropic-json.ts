import { cachedSystemParts } from "@/lib/ai/anthropic";
import {
  ANTHROPIC_TIMEOUT_MS,
  WINSTON_PAID_CHAT_MODEL,
} from "@/lib/ai/constants";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
  error?: { message?: string };
};

export async function callAnthropicJson(input: {
  system: ReturnType<typeof cachedSystemParts>;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ jsonText: string; usage: { input: number; output: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model ?? WINSTON_PAID_CHAT_MODEL,
      max_tokens: input.maxTokens ?? 1200,
      system: input.system,
      messages: [{ role: "user", content: input.userPrompt }],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  const data = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic request failed");
  }

  const jsonText = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return {
    jsonText,
    usage: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0,
    },
  };
}
