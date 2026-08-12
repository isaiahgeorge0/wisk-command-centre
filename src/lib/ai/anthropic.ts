/**
 * Shared Anthropic Messages helpers — prompt caching shapes and stream parsing.
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
 * Wrap a mostly-static system prompt so Anthropic can cache the prefix.
 * Short prompts below the model minimum silently skip caching (no error).
 */
export function cachedSystemPrompt(
  text: string,
  options?: { ttl?: "1h" }
): AnthropicSystemBlock[] {
  return [
    {
      type: "text",
      text,
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
 */
export function cachedSystemParts(
  parts: Array<{ text: string; cache?: boolean; ttl?: "5m" | "1h" }>
): AnthropicSystemBlock[] {
  return parts.map((part) => {
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
}
