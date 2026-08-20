import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import type {
  FocusSignal,
  FocusSourceFigure,
} from "@/lib/overview/focus-signals";
import {
  buildDeadlineTeaser,
  buildGreetingLine,
  resolveGreetingTerm,
  type UserGender,
} from "@/lib/morning/greeting";
import { formatLocalDate, getLocalTime } from "@/lib/morning/timezone";

export type MorningBriefingTier = "free" | "paid";

export type MorningBriefingContent = {
  /** Missing on pre-tier rows — treat as paid. */
  tier?: MorningBriefingTier;
  greeting: string;
  date: string;
  /** Collapsed-card teaser. Missing on pre-066 rows — fall back to headline. */
  teaser?: string;
  /** Free tier: the single Winston insight. */
  insight?: string;
  headline: string;
  /** Expanded modal prose. Missing on pre-066 rows — fall back to headline. */
  summary?: string;
  focuses: Array<{
    category: string;
    item: string;
    href: string;
    urgency: "high" | "medium" | "low";
  }>;
  focusPlan?: {
    summary: string;
    sourceFigures: FocusSourceFigure[];
  };
  encouragement: string;
  generatedAt: string;
};

export type BriefingContext = {
  overdueTasks: Array<{ title: string; due_date: string }>;
  dueTodayTasks: Array<{ title: string }>;
  stalledLeads: Array<{ name: string; days: number }>;
  goalDeadlines: Array<{ title: string; deadline: string }>;
  contentDueToday: Array<{ title: string }>;
  openMaintenance: number;
  rentDueCount: number;
  projectsPastDeadline: Array<{ title: string; deadline: string }>;
  projectsApproachingDeadline: Array<{ title: string; deadline: string }>;
};

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
  error?: { message?: string };
};

type GeneratedFocus = {
  category?: unknown;
  item?: unknown;
  urgency?: unknown;
};

type GeneratedFocusPlan = {
  summary?: unknown;
};

const CATEGORY_HREFS: Record<string, string> = {
  Tasks: "/tasks",
  Projects: "/projects",
  Leads: "/leads",
  Goals: "/goals",
  Content: "/content",
  Properties: "/properties/dashboard",
};

const URGENCIES = new Set(["high", "medium", "low"]);

const FREE_MODEL = "claude-haiku-4-5-20251001";
const PAID_MODEL = "claude-sonnet-4-6";

export type GenerateBriefingOptions = {
  userId: string;
  displayName: string;
  gender?: UserGender | null;
  greetingTerm?: string | null;
  context: BriefingContext;
  timezone: string;
  /** Defaults to paid (full briefing). */
  tier?: MorningBriefingTier;
};

export function isFreeBriefing(
  content: MorningBriefingContent | null | undefined
): boolean {
  return content?.tier === "free";
}

export function getBriefingCardTeaser(content: MorningBriefingContent): string {
  if (isFreeBriefing(content)) {
    return (
      content.insight?.trim() ||
      content.teaser?.trim() ||
      content.headline?.trim() ||
      content.greeting
    );
  }
  return (
    content.teaser?.trim() ||
    content.headline?.trim() ||
    content.greeting
  );
}

function buildContextBlock(context: BriefingContext): string {
  return `Business context:
${
  context.projectsPastDeadline.length > 0
    ? `PROJECTS PAST DEADLINE (${context.projectsPastDeadline.length}): ${context.projectsPastDeadline
        .slice(0, 5)
        .map((project) => project.title)
        .join(", ")}`
    : "No projects past deadline."
}
${
  context.projectsApproachingDeadline.length > 0
    ? `PROJECTS APPROACHING DEADLINE (${context.projectsApproachingDeadline.length}): ${context.projectsApproachingDeadline
        .slice(0, 5)
        .map((project) => `${project.title} (${project.deadline})`)
        .join(", ")}`
    : "No projects approaching deadline."
}
${
  context.overdueTasks.length > 0
    ? `OVERDUE TASKS (${context.overdueTasks.length}): ${context.overdueTasks
        .slice(0, 3)
        .map((task) => task.title)
        .join(", ")}`
    : "No overdue tasks."
}
${
  context.dueTodayTasks.length > 0
    ? `DUE TODAY: ${context.dueTodayTasks
        .slice(0, 3)
        .map((task) => task.title)
        .join(", ")}`
    : ""
}
${
  context.stalledLeads.length > 0
    ? `STALLED LEADS: ${context.stalledLeads
        .slice(0, 3)
        .map((lead) => `${lead.name} (${lead.days} days)`)
        .join(", ")}`
    : "No stalled leads."
}
${
  context.goalDeadlines.length > 0
    ? `UPCOMING GOAL DEADLINES: ${context.goalDeadlines
        .slice(0, 2)
        .map((goal) => goal.title)
        .join(", ")}`
    : ""
}
${
  context.contentDueToday.length > 0
    ? `CONTENT DUE TODAY: ${context.contentDueToday
        .map((content) => content.title)
        .join(", ")}`
    : ""
}
${
  context.openMaintenance > 0
    ? `OPEN MAINTENANCE ISSUES: ${context.openMaintenance}`
    : ""
}
${
  context.rentDueCount > 0
    ? `RENT DUE: ${context.rentDueCount} tenant(s)`
    : ""
}`;
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: ReturnType<typeof cachedSystemParts>;
  userPrompt: string;
}): Promise<AnthropicResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.userPrompt }],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });

  const data = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic briefing request failed");
  }
  return data;
}

function extractText(data: AnthropicResponse): string {
  return (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function buildFocusPromptSignals(signals: FocusSignal[]): string {
  if (signals.length === 0) {
    return "No current focus signals.";
  }

  return signals
    .slice(0, 12)
    .map((signal, index) => {
      const detail = signal.detail ? ` (${signal.detail})` : "";
      return `${index + 1}. [${signal.urgency.toUpperCase()}] ${signal.category}: ${signal.label}${detail}`;
    })
    .join("\n");
}

async function generateFreeBriefing(
  options: GenerateBriefingOptions & {
    apiKey: string;
    greeting: string;
    dateLabel: string;
    teaser: string;
    term: string;
    now: Date;
  }
): Promise<MorningBriefingContent> {
  const { userId, displayName, context, apiKey, greeting, dateLabel, teaser, term, now } =
    options;

  const briefingRules = `You are Winston, WISK's AI business assistant. Write one short morning insight for a free user — a taster of what full Winston briefings offer.

Return ONLY valid JSON matching this exact shape:
{
  "insight": "one or two sentences — the single most useful thing to know today"
}

Rules:
- Pick the single most pressing item (most overdue task/project, stalled work, or similar).
- If nothing is urgent, say so plainly and offer a calm, useful focus — do not invent urgency.
- No greeting, no lists, no encouragement closer.
- Keep it under 40 words.
- Be confident, direct, and premium — warm without being corporate.`;

  const systemPrompt = cachedSystemParts([
    { text: briefingRules, cache: true },
    {
      text: `Address this person as "${term}" (display name on file: ${displayName}).`,
    },
  ]);

  const userPrompt = `Today is ${dateLabel}.

${buildContextBlock(context)}

Generate the single-insight JSON.`;

  const data = await callAnthropic({
    apiKey,
    model: FREE_MODEL,
    maxTokens: 180,
    system: systemPrompt,
    userPrompt,
  });

  const parsed = JSON.parse(extractText(data)) as { insight?: unknown };
  if (typeof parsed.insight !== "string" || !parsed.insight.trim()) {
    throw new Error("Anthropic returned an invalid free morning briefing");
  }

  const insight = parsed.insight.trim();

  await logUsage(
    userId,
    "morning_briefing",
    data.usage?.input_tokens ?? 0,
    data.usage?.output_tokens ?? 0
  );

  return {
    tier: "free",
    greeting,
    date: dateLabel,
    teaser: teaser || insight,
    insight,
    headline: insight,
    summary: insight,
    focuses: [],
    encouragement: "",
    generatedAt: now.toISOString(),
  };
}

async function generatePaidBriefing(
  options: GenerateBriefingOptions & {
    apiKey: string;
    greeting: string;
    dateLabel: string;
    teaser: string;
    term: string;
    now: Date;
  }
): Promise<MorningBriefingContent> {
  const { userId, displayName, context, apiKey, greeting, dateLabel, teaser, term, now } =
    options;

  const briefingRules = `You are Winston, WISK's AI business assistant generating a morning briefing. Be confident, direct, and premium — warm without being corporate or cheesy. Never use filler phrases like "Certainly!" or "Great question!".

Return ONLY valid JSON matching this exact shape:
{
  "headline": "one sentence, Winston's read on today",
  "summary": "a flowing natural-language paragraph covering what matters today",
  "focuses": [
    {
      "category": "Tasks|Projects|Leads|Goals|Content|Properties",
      "item": "specific actionable item",
      "urgency": "high|medium|low"
    }
  ],
  "encouragement": "one closing sentence, genuine not cheesy"
}

Rules:
- summary: target 150–200 words when there is enough to say. Shorter is fine if the day is light. Only go longer when there is genuinely a lot that needs attention. Cover key tasks, projects, goals, and other time-sensitive items. Do not invent urgency — if nothing is urgent, say the day looks manageable and point to useful focus areas.
- focuses: 3-5 items maximum, most urgent first. Only include items that genuinely need attention today.
- If something is overdue, say so directly.
- encouragement: one sentence, no exclamation marks.
- headline: under 15 words, specific to their situation.
- Do not include a greeting or teaser in the JSON — those are built separately.`;

  const systemPrompt = cachedSystemParts([
    { text: briefingRules, cache: true },
    {
      text: `Address this person as "${term}" (display name on file: ${displayName}).`,
    },
  ]);

  const userPrompt = `Today is ${dateLabel}.

${buildContextBlock(context)}

Generate the morning briefing JSON.`;

  const data = await callAnthropic({
    apiKey,
    model: PAID_MODEL,
    maxTokens: 1200,
    system: systemPrompt,
    userPrompt,
  });

  const parsed = JSON.parse(extractText(data)) as {
    headline?: unknown;
    summary?: unknown;
    focuses?: unknown;
    encouragement?: unknown;
  };

  if (
    typeof parsed.headline !== "string" ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.focuses) ||
    typeof parsed.encouragement !== "string"
  ) {
    throw new Error("Anthropic returned an invalid morning briefing");
  }

  const focuses = (parsed.focuses as GeneratedFocus[])
    .filter(
      (focus) =>
        typeof focus.category === "string" &&
        typeof focus.item === "string" &&
        typeof focus.urgency === "string" &&
        URGENCIES.has(focus.urgency)
    )
    .slice(0, 5)
    .map((focus) => {
      const category = focus.category as string;
      return {
        category,
        item: focus.item as string,
        urgency: focus.urgency as "high" | "medium" | "low",
        href: CATEGORY_HREFS[category] ?? "/",
      };
    });

  await logUsage(
    userId,
    "morning_briefing",
    data.usage?.input_tokens ?? 0,
    data.usage?.output_tokens ?? 0
  );

  return {
    tier: "paid",
    greeting,
    date: dateLabel,
    teaser,
    headline: parsed.headline,
    summary: parsed.summary,
    focuses,
    encouragement: parsed.encouragement,
    generatedAt: now.toISOString(),
  };
}

export async function generateFocusPlan(input: {
  userId: string;
  displayName: string;
  signals: FocusSignal[];
  sourceFigures: FocusSourceFigure[];
}): Promise<{ summary: string; sourceFigures: FocusSourceFigure[] } | null> {
  const { userId, displayName, signals, sourceFigures } = input;
  if (signals.length === 0) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const systemPrompt = cachedSystemParts([
    {
      text: `You are Winston, WISK's AI business assistant. Write a short Focus plan that reasons across a list of already-identified signals.

Return ONLY valid JSON matching this exact shape:
{
  "summary": "2-3 sentences connecting the signals into a sensible plan"
}

Rules:
- This is the paid Focus layer that sits above a raw signal list.
- Reason across the signals. Prioritise and connect them. Do not just restate the list item by item.
- Do NOT invent any new facts, dates, counts, money amounts, or durations.
- Avoid exact figures entirely in the prose. Use qualitative phrasing like "several", "multiple", "a few days", or "later this week" instead.
- Do not quote or paraphrase the source-figures line; the UI shows verified figures separately.
- Keep it concise: 2-3 sentences, under 90 words total.
- Tone: direct, calm, premium, useful. No hype, no filler, no exclamation marks.`,
      cache: true,
    },
    {
      text: `The user's display name on file is ${displayName}.`,
    },
  ]);

  const userPrompt = `Verified source figures (shown separately in UI):
${sourceFigures.map((figure) => `- ${figure.label}: ${figure.value}`).join("\n")}

Current Focus signals:
${buildFocusPromptSignals(signals)}

Generate the JSON.`;

  const data = await callAnthropic({
    apiKey,
    model: PAID_MODEL,
    maxTokens: 220,
    system: systemPrompt,
    userPrompt,
  });

  const parsed = JSON.parse(extractText(data)) as GeneratedFocusPlan;
  if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
    throw new Error("Anthropic returned an invalid Focus plan");
  }

  await logUsage(
    userId,
    "morning_briefing",
    data.usage?.input_tokens ?? 0,
    data.usage?.output_tokens ?? 0
  );

  return {
    summary: parsed.summary.trim(),
    sourceFigures,
  };
}

export async function generateMorningBriefing(
  options: GenerateBriefingOptions
): Promise<MorningBriefingContent> {
  const {
    gender,
    greetingTerm,
    context,
    timezone,
    tier = "paid",
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const now = new Date();
  const dateLabel = formatLocalDate(timezone, now);
  const { hour } = getLocalTime(timezone, now);
  const term = resolveGreetingTerm(gender, greetingTerm);
  const greeting = buildGreetingLine(hour, term);
  const teaser = buildDeadlineTeaser(
    greeting,
    context.projectsApproachingDeadline.length,
    context.projectsPastDeadline.length
  );

  const shared = {
    ...options,
    apiKey,
    greeting,
    dateLabel,
    teaser,
    term,
    now,
  };

  if (tier === "free") {
    return generateFreeBriefing(shared);
  }

  return generatePaidBriefing(shared);
}
