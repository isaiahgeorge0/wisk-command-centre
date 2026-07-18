import { logUsage } from "@/lib/ai/usage-logger";
import { formatLocalDate } from "@/lib/morning/timezone";

export type MorningBriefingContent = {
  greeting: string;
  date: string;
  headline: string;
  focuses: Array<{
    category: string;
    item: string;
    href: string;
    urgency: "high" | "medium" | "low";
  }>;
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

const CATEGORY_HREFS: Record<string, string> = {
  Tasks: "/tasks",
  Leads: "/leads",
  Goals: "/goals",
  Content: "/content",
  Properties: "/properties/dashboard",
};

const URGENCIES = new Set(["high", "medium", "low"]);

export async function generateMorningBriefing(
  userId: string,
  displayName: string,
  context: BriefingContext,
  timezone: string
): Promise<MorningBriefingContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const now = new Date();
  const dateLabel = formatLocalDate(timezone, now);
  const systemPrompt = `You are Winston, WISK's AI business assistant. You are generating a morning briefing for ${displayName}. Be concise, warm, and direct. Sound like a trusted advisor who knows their business well — not a corporate assistant. Never use filler phrases like "Certainly!" or "Great question!".

Return ONLY valid JSON matching this exact shape:
{
  "headline": "one sentence, Winston's read on today",
  "focuses": [
    {
      "category": "Tasks|Leads|Goals|Content|Properties",
      "item": "specific actionable item",
      "urgency": "high|medium|low"
    }
  ],
  "encouragement": "one closing sentence, genuine not cheesy"
}

Rules:
- focuses: 3-5 items maximum, most urgent first
- Only include focuses that genuinely need attention today
- If something is overdue, say so directly
- encouragement: one sentence, no exclamation marks
- headline: under 15 words, specific to their situation`;

  const userPrompt = `Today is ${dateLabel}.

Business context:
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
}

Generate the morning briefing JSON.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic briefing request failed");
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean) as {
    headline?: unknown;
    focuses?: unknown;
    encouragement?: unknown;
  };

  if (
    typeof parsed.headline !== "string" ||
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
    greeting: `Good morning, ${displayName}`,
    date: dateLabel,
    headline: parsed.headline,
    focuses,
    encouragement: parsed.encouragement,
    generatedAt: now.toISOString(),
  };
}
