import type { UserContext } from "@/lib/ai/context-builder";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DigestContent = {
  weekSummary: string;
  wins: string[];
  needsAttention: string[];
  weekAhead: string[];
  insight: string;
  recommendation: string;
  generatedAt: string;
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

const SYSTEM_PROMPT = `You are Winston, the AI business assistant for WISK — a command centre for ambitious entrepreneurs, creators, and business owners. Your role is to provide a weekly business digest that feels like a trusted advisor — constructive, insightful, warm but direct. You notice patterns, celebrate wins, flag risks early, and always give one clear recommendation for the week ahead. You never lecture or over-criticise. You are on the user's side.`;

function buildUserPrompt(ctx: UserContext): string {
  const lines: string[] = [];

  lines.push(`Generate a weekly business digest for ${ctx.user.name}.`);
  lines.push(`Week reviewed: ${ctx.weekStart} to ${ctx.weekEnd}`);
  lines.push(``);

  // Projects
  lines.push(`## PROJECTS (Active: ${ctx.projects.active.length})`);
  for (const p of ctx.projects.active) {
    const deadline = p.deadline ? `, deadline ${p.deadline}` : "";
    const value = p.value ? `, value £${p.value}` : "";
    const tasks = p.task_count > 0 ? `, ${p.task_count} open tasks` : "";
    const next = p.next_action ? `, next: "${p.next_action}"` : "";
    lines.push(`- ${p.name}${deadline}${value}${tasks}${next}`);
  }
  if (ctx.projects.stalled.length > 0) {
    lines.push(`Stalled (no update in 7+ days): ${ctx.projects.stalled.join(", ")}`);
  }
  if (ctx.projects.deadlineSoon.length > 0) {
    lines.push(`Deadline this week: ${ctx.projects.deadlineSoon.join(", ")}`);
  }
  lines.push(``);

  // Tasks
  lines.push(`## TASKS`);
  lines.push(`Completed this week: ${ctx.tasks.completedCount}`);
  if (ctx.tasks.completedTitles.length > 0) {
    lines.push(`Completed titles: ${ctx.tasks.completedTitles.slice(0, 10).join(", ")}`);
  }
  if (ctx.tasks.overdue.length > 0) {
    lines.push(`Overdue (${ctx.tasks.overdue.length}): ${ctx.tasks.overdue.slice(0, 8).join(", ")}`);
  }
  if (ctx.tasks.dueSoon.length > 0) {
    lines.push(`Due this week: ${ctx.tasks.dueSoon.slice(0, 8).join(", ")}`);
  }
  if (ctx.tasks.highPriorityIncomplete.length > 0) {
    lines.push(`High priority incomplete: ${ctx.tasks.highPriorityIncomplete.slice(0, 5).join(", ")}`);
  }
  lines.push(``);

  // Goals
  lines.push(`## GOALS`);
  for (const g of ctx.goals.all.slice(0, 8)) {
    const deadline = g.deadline ? `, deadline ${g.deadline}` : "";
    lines.push(`- ${g.title}: ${g.percentComplete}% (${g.current}/${g.target} ${g.unit ?? ""})${deadline} [${g.status}]`);
  }
  if (ctx.goals.completedThisWeek.length > 0) {
    lines.push(`Reached 100% this week: ${ctx.goals.completedThisWeek.join(", ")}`);
  }
  if (ctx.goals.noProgressStalled.length > 0) {
    lines.push(`No progress in 7+ days: ${ctx.goals.noProgressStalled.join(", ")}`);
  }
  lines.push(``);

  // Leads
  lines.push(`## LEADS`);
  lines.push(`Total pipeline value: £${ctx.leads.totalPipelineValue}`);
  if (ctx.leads.newThisWeek.length > 0) {
    lines.push(`New this week: ${ctx.leads.newThisWeek.join(", ")}`);
  }
  if (ctx.leads.wonThisWeek.length > 0) {
    const wonStr = ctx.leads.wonThisWeek
      .map((l) => (l.value ? `${l.name} (£${l.value})` : l.name))
      .join(", ");
    lines.push(`Won this week: ${wonStr}`);
  }
  if (ctx.leads.stalled.length > 0) {
    lines.push(`Stalled 14+ days: ${ctx.leads.stalled.join(", ")}`);
  }
  lines.push(``);

  // Content
  lines.push(`## CONTENT`);
  if (ctx.content.publishedThisWeek.length > 0) {
    lines.push(`Published this week:`);
    for (const p of ctx.content.publishedThisWeek) {
      lines.push(`  - "${p.title}"${p.platforms ? ` (${p.platforms})` : ""}`);
    }
  } else {
    lines.push(`Published this week: none`);
  }
  if (ctx.content.scheduledNextWeek.length > 0) {
    lines.push(`Scheduled next 7 days:`);
    for (const p of ctx.content.scheduledNextWeek) {
      lines.push(`  - "${p.title}"${p.platforms ? ` (${p.platforms})` : ""}`);
    }
  }
  lines.push(``);

  // Ideas
  if (ctx.ideas.newThisWeek.length > 0) {
    lines.push(`## IDEAS CAPTURED THIS WEEK`);
    lines.push(ctx.ideas.newThisWeek.slice(0, 8).join(", "));
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`Respond ONLY with valid JSON — no markdown fences, no preamble, no commentary outside the JSON. The JSON must exactly match this TypeScript type:`);
  lines.push(`{`);
  lines.push(`  "weekSummary": string,   // 2-3 sentence overview of the week`);
  lines.push(`  "wins": string[],         // 3-5 specific wins`);
  lines.push(`  "needsAttention": string[], // 2-4 specific concerns`);
  lines.push(`  "weekAhead": string[],    // 3-5 key things coming up`);
  lines.push(`  "insight": string,        // 1 pattern noticed, 2-3 sentences`);
  lines.push(`  "recommendation": string, // 1 specific action for the week, 2-3 sentences`);
  lines.push(`  "generatedAt": string     // ISO timestamp, use: "${ctx.generatedAt}"`);
  lines.push(`}`);

  return lines.join("\n");
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function generateWeeklyDigest(
  context: UserContext
): Promise<DigestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(context),
        },
      ],
    }),
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

  // Basic shape validation
  if (
    typeof digest.weekSummary !== "string" ||
    !Array.isArray(digest.wins) ||
    !Array.isArray(digest.needsAttention) ||
    !Array.isArray(digest.weekAhead) ||
    typeof digest.insight !== "string" ||
    typeof digest.recommendation !== "string"
  ) {
    throw new Error(
      "Claude response did not match DigestContent shape"
    );
  }

  // Always stamp with server-side time
  digest.generatedAt = context.generatedAt;

  return { digest, inputTokens, outputTokens };
}
