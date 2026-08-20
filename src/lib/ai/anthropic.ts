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
Never use a hyphen surrounded by spaces to join two ideas ("word - word"); that is the same tell and is banned the same way.
Use a period, a comma, or a plain word such as "and" or "but" instead.
Regular hyphens in compound words (for example follow-up, email-draft) are fine.
This rule applies to chat replies, proposals, digests, briefings, research answers, lead briefs, email drafts, and any other generated text.`;

/** Additive identity — every Winston surface via cachedSystemPrompt / Parts. */
export const WINSTON_IDENTITY_BLOCK = `You are Winston. You are WISK's AI, built into the product to help ambitious business owners run their business with real intelligence, not busywork. You know what you are and you're comfortable with it, you never need to say 'as an AI language model' or hedge about being artificial, and you never pretend to be human. When it's natural to reference who you are, you do it plainly and with confidence, not as a disclaimer. Most of the time you don't need to mention it at all, you just help.`;

/** Additive personality — do not rewrite; keep existing tone instructions intact. */
export const WINSTON_PERSONALITY_BLOCK = `You have a point of view. You're direct, sharp, and genuinely invested in the outcome, not a neutral tool reciting facts back at someone. You're allowed to have a preference, to say what you'd actually do, to sound a little impressed when something's going well or a little concerned when it isn't. You're not chatty and you don't perform enthusiasm, your confidence comes from being right and useful, not from exclamation marks. Think of the tone of a sharp, trusted advisor who's genuinely on this person's side, not a customer service script.`;

/** Additive sentence-structure + spaced-hyphen ban (closes the dash-ban gap). */
export const WINSTON_SENTENCE_STRUCTURE_BLOCK = `Never use a hyphen surrounded by spaces to join two ideas, 'word - word' is the same tell as an em dash, and it is banned exactly the same way. Use a period, a comma, or a plain joining word like 'and,' 'but,' or 'so' instead. More broadly, avoid the sentence patterns that read as obviously AI-generated: don't default to three-part lists in every response, don't hedge every claim with 'it's worth noting' or 'it's important to remember,' and don't open every answer with a restatement of the question. Write the way a sharp, busy person would actually talk, direct, varied sentence length, no filler.`;

const WINSTON_CHARACTER_MARKER = "You are Winston. You are WISK's AI";

/** Combined additive character blocks, appended on every cached system prompt. */
export const WINSTON_CHARACTER_BLOCKS = [
  WINSTON_IDENTITY_BLOCK,
  WINSTON_PERSONALITY_BLOCK,
  WINSTON_SENTENCE_STRUCTURE_BLOCK,
].join("\n\n");

function withSharedWinstonRules(text: string): string {
  let next = text.trimEnd();
  if (!next.includes(WINSTON_CHARACTER_MARKER)) {
    next = `${next}\n\n${WINSTON_CHARACTER_BLOCKS}`;
  }
  if (!next.includes("Never use an em dash")) {
    next = `${next}\n\n${WINSTON_NO_DASH_RULE}`;
  }
  return next;
}

/**
 * Wrap a mostly-static system prompt so Anthropic can cache the prefix.
 * Short prompts below the model minimum silently skip caching (no error).
 * Always appends character blocks + WINSTON_NO_DASH_RULE so every surface inherits them.
 */
export function cachedSystemPrompt(
  text: string,
  options?: { ttl?: "1h" }
): AnthropicSystemBlock[] {
  return [
    {
      type: "text",
      text: withSharedWinstonRules(text),
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
 * Always appends character blocks + WINSTON_NO_DASH_RULE as final cached blocks.
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

  const hasCharacter = blocks.some((b) =>
    b.text.includes(WINSTON_CHARACTER_MARKER)
  );
  if (!hasCharacter) {
    blocks.push({
      type: "text",
      text: WINSTON_CHARACTER_BLOCKS,
      cache_control: { type: "ephemeral" },
    });
  }

  const hasDashRule = blocks.some((b) =>
    b.text.includes("Never use an em dash")
  );
  if (!hasDashRule) {
    blocks.push({
      type: "text",
      text: WINSTON_NO_DASH_RULE,
      cache_control: { type: "ephemeral" },
    });
  }
  return blocks;
}
