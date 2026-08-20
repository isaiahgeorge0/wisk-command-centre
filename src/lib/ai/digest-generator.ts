import type { UserContext } from "@/lib/ai/context-builder";
import { formatBusinessContext } from "@/lib/ai/format-user-context";
import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { cachedSystemPrompt } from "@/lib/ai/anthropic";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DigestLeadIntelligenceFigures = {
  pipelineValue: { oneTime: number; monthly: number };
  conversionRate: number;
  avgResponseTimeDays: number | null;
  activeLeadCount: number;
  overdueFollowUpCount: number;
  wonThisWeek: Array<{
    name: string;
    value: number | null;
    valueType: "one_time" | "monthly";
  }>;
};

export type DigestContentStrategyFigures = {
  publishingStreak: number;
  avgPostsPerWeek: number;
};

export type DigestGoalVelocityFigure = {
  title: string;
  percentComplete: number;
  projectedCompletion: string | null;
};

export type DigestContent = {
  weekSummary: string;
  wins: string[];
  needsAttention: string[];
  weekAhead: string[];
  insight: string;
  recommendation: string;
  generatedAt: string;
  // Pro-only (undefined for base AI)
  crossSectionInsights?: string[];
  leadIntelligence?: string;
  /** Precomputed from lead records; UI formats — do not parse from prose. */
  leadIntelligenceFigures?: DigestLeadIntelligenceFigures;
  contentStrategy?: string;
  contentStrategyFigures?: DigestContentStrategyFigures;
  goalVelocityInsight?: string;
  goalVelocityFigures?: DigestGoalVelocityFigure[];
  proRecommendations?: string[];
};

// ─── Anthropic response shape (minimal) ───────────────────────────────────────

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicContentBlock = AnthropicTextBlock | { type: string };

type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

export type DigestResult = {
  digest: DigestContent;
  inputTokens: number;
  outputTokens: number;
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are Winston, the AI business assistant for WISK: a command centre for ambitious entrepreneurs, creators, and business owners. Your role is to provide a weekly business digest that feels like a trusted advisor: constructive, insightful, warm but direct. You notice patterns, celebrate wins, flag risks early, and always give one clear recommendation for the week ahead. You never lecture or over-criticise. You are on the user's side. Refer to people and records by name. Never restate currency amounts, values, £ figures, percentages, or "k" shorthand. Do not invent, round, abbreviate, convert, or recalculate any figure. Exact amounts are attached by the application from source data and shown in the UI.`;

const PRO_SYSTEM_APPENDIX = ` As an AI Pro subscriber, you have access to deeper analytics. Provide richer, more specific qualitative insights. Your recommendations should be actionable within 48 hours. Never restate currency amounts, values, £ figures, percentages, or "k" shorthand. Do not invent, round, abbreviate, convert, or recalculate any figure. Exact amounts are attached by the application from source data and shown in the UI.`;

function isProTier(ctx: UserContext): boolean {
  return ctx.subscriptionTier === "ai_pro" || ctx.subscriptionTier === "max";
}

function getSystemPrompt(ctx: UserContext): string {
  if (isProTier(ctx)) {
    return BASE_SYSTEM_PROMPT + PRO_SYSTEM_APPENDIX;
  }
  return BASE_SYSTEM_PROMPT;
}

function buildUserPrompt(ctx: UserContext): string {
  const isPro = isProTier(ctx);
  const lines: string[] = [];

  lines.push(`Generate a weekly business digest for ${ctx.user.name}.`);
  if (isPro) {
    lines.push(
      `Time horizon: review the past 30 days and look ahead 30 days where relevant.`
    );
  }
  lines.push(`Week reviewed: ${ctx.weekStart} to ${ctx.weekEnd}`);
  lines.push("");
  lines.push(formatBusinessContext(ctx, { includeProExtras: isPro }));
  lines.push("");

  if (isPro) {
    lines.push(`## CROSS-SECTION PATTERNS`);
    lines.push(
      `Analyse patterns across sections, does content publishing correlate with lead generation? Do task completion rates reflect project health? Flag any concerning patterns.`
    );
    lines.push("");
  }

  lines.push(`---`);
  lines.push(
    `Respond ONLY with valid JSON, no markdown fences, no preamble, no commentary outside the JSON. The JSON must exactly match this TypeScript type:`
  );
  lines.push(`{`);
  lines.push(`  "weekSummary": string,   // 2-3 sentence overview of the week`);
  lines.push(`  "wins": string[],         // 3-5 specific wins`);
  lines.push(`  "needsAttention": string[], // 2-4 specific concerns`);
  lines.push(`  "weekAhead": string[],    // 3-5 key things coming up`);
  lines.push(`  "insight": string,        // 1 pattern noticed, 2-3 sentences`);
  lines.push(
    `  "recommendation": string, // 1 specific action for the week, 2-3 sentences`
  );
  lines.push(
    `  "generatedAt": string     // ISO timestamp, use: "${ctx.generatedAt}"`
  );
  if (isPro) {
    lines.push(
      `  "crossSectionInsights": string[], // 2-3 qualitative patterns across sections`
    );
    lines.push(
      `  "leadIntelligence": string,       // qualitative lead insight, no currency, values, or %`
    );
    lines.push(
      `  "contentStrategy": string,        // qualitative content recommendation, no counts or rates`
    );
    lines.push(
      `  "goalVelocityInsight": string,    // qualitative goal trajectory, no percentages`
    );
    lines.push(`  "proRecommendations": string[]    // 3 specific actions`);
  }
  lines.push(`}`);
  lines.push("");
  lines.push(
    "Figures in the context above are context only, do not copy currency amounts, values, £ figures, percentages, or \"k\" shorthand into any JSON field. Exact amounts are attached by the application from source data and shown in the UI."
  );

  return lines.join("\n");
}

function validateDigestShape(
  digest: DigestContent,
  isPro: boolean
): void {
  if (
    typeof digest.weekSummary !== "string" ||
    !Array.isArray(digest.wins) ||
    !Array.isArray(digest.needsAttention) ||
    !Array.isArray(digest.weekAhead) ||
    typeof digest.insight !== "string" ||
    typeof digest.recommendation !== "string"
  ) {
    throw new Error("Claude response did not match DigestContent shape");
  }

  if (!isPro) return;

  if (
    !Array.isArray(digest.crossSectionInsights) ||
    typeof digest.leadIntelligence !== "string" ||
    typeof digest.contentStrategy !== "string" ||
    typeof digest.goalVelocityInsight !== "string" ||
    !Array.isArray(digest.proRecommendations)
  ) {
    throw new Error("Claude response did not match AI Pro DigestContent shape");
  }
}

function attachSourceValues(
  digest: DigestContent,
  ctx: UserContext
): DigestContent {
  if (!isProTier(ctx)) return digest;

  return {
    ...digest,
    leadIntelligenceFigures: {
      pipelineValue: ctx.leads.pipelineValue,
      conversionRate: ctx.leads.conversionRate,
      avgResponseTimeDays: ctx.leads.avgResponseTimeDays,
      activeLeadCount: ctx.leads.activeLeadCount,
      overdueFollowUpCount: ctx.leads.overdueFollowUps.length,
      wonThisWeek: ctx.leads.wonThisWeek.map((lead) => ({
        name: lead.name,
        value: lead.value,
        valueType: lead.value_type ?? "one_time",
      })),
    },
    contentStrategyFigures: {
      publishingStreak: ctx.content.publishingStreak,
      avgPostsPerWeek: ctx.content.avgPostsPerWeek,
    },
    goalVelocityFigures: ctx.goals.velocityByGoal.map((goal) => ({
      title: goal.title,
      percentComplete: goal.percentComplete,
      projectedCompletion: goal.projectedCompletion,
    })),
  };
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function generateWeeklyDigest(
  context: UserContext
): Promise<DigestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const isPro = isProTier(context);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: isPro ? 2500 : 1500,
      system: cachedSystemPrompt(getSystemPrompt(context)),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(context),
        },
      ],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `Anthropic API error ${response.status}: ${body}`
    );
  }

  const json: AnthropicResponse = await response.json() as AnthropicResponse;

  const firstBlock = json.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Anthropic response did not contain a text block");
  }

  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;

  let raw = (firstBlock as AnthropicTextBlock).text.trim();

  // Strip markdown fences if Claude wrapped the JSON
  if (raw.startsWith("```")) {
    raw = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/, "")
      .trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Failed to parse DigestContent JSON from Claude response. Raw text: ${raw.slice(0, 200)}`
    );
  }

  const digest = parsed as DigestContent;
  validateDigestShape(digest, isPro);

  // Always stamp with server-side time
  digest.generatedAt = context.generatedAt;

  return {
    digest: attachSourceValues(digest, context),
    inputTokens,
    outputTokens,
  };
}
