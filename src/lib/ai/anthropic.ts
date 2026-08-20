/**
 * Shared Anthropic Messages helpers (prompt caching shapes and stream parsing).
 */

export type AnthropicCacheControl = {
  type: "ephemeral";
  ttl?: "5m" | "1h";
};

export type AnthropicSystemBlock = {
  type: "text";
  text: string;
  cache_control?: AnthropicCacheControl;
};

/**
 * Hard rule for every Winston / Anthropic surface that uses cachedSystemPrompt
 * or cachedSystemParts. Em dashes and en dashes read as AI-generated prose.
 * Prefer a period, comma, or a plain word like "and" / "but" instead.
 */
export const WINSTON_NO_DASH_RULE = `WRITING RULE (non-negotiable, every reply and every JSON string field):
Never use an em dash (—) or an en dash (–) anywhere in your output.
Do not use them as sentence punctuation, in lists, in asides, or between clauses.
Use a period, a comma, or a plain word such as "and" or "but" instead.
Regular hyphens in compound words (for example follow-up, email-draft) are fine.
This rule applies to chat replies, proposals, digests, briefings, research answers, lead briefs, email drafts, and any other generated text.`;

function withNoDashRule(text: string): string {
  if (text.includes("Never use an em dash")) return text;
  return `${text.trimEnd()}\n\n${WINSTON_NO_DASH_RULE}`;
}

/**
 * Wrap a mostly-static system prompt so Anthropic can cache the prefix.
 * Short prompts below the model minimum silently skip caching (no error).
 * Always appends WINSTON_NO_DASH_RULE so every surface inherits the ban.
 */
export function cachedSystemPrompt(
  text: string,
  options?: { ttl?: "1h" }
): AnthropicSystemBlock[] {
  return [
    {
      type: "text",
      text: withNoDashRule(text),
      cache_control: {
        type: "ephemeral",
        ...(options?.ttl ? { ttl: options.ttl } : {}),
      },
    },
  ];
}

/**
 * Multi-block system prompt. Put `cache: true` on the last stable block so
 * everything up to that breakpoint is cached as one prefix.
 * Always appends WINSTON_NO_DASH_RULE as a final cached block.
 */
export function cachedSystemParts(
  parts: Array<{ text: string; cache?: boolean; ttl?: "5m" | "1h" }>
): AnthropicSystemBlock[] {
  const blocks = parts.map((part) => {
    const block: AnthropicSystemBlock = {
      type: "text",
      text: part.text,
    };
    if (part.cache) {
      block.cache_control = {
        type: "ephemeral",
        ...(part.ttl ? { ttl: part.ttl } : {}),
      };
    }
    return block;
  });

  const alreadyPresent = blocks.some((b) =>
    b.text.includes("Never use an em dash")
  );
  if (!alreadyPresent) {
    blocks.push({
      type: "text",
      text: WINSTON_NO_DASH_RULE,
      cache_control: { type: "ephemeral" },
    });
  }
  return blocks;
}
