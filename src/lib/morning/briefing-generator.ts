import { logUsage } from "@/lib/ai/usage-logger";
import {
  buildDeadlineTeaser,
  buildGreetingLine,
  resolveGreetingTerm,
  type UserGender,
} from "@/lib/morning/greeting";
import { formatLocalDate, getLocalTime } from "@/lib/morning/timezone";

export type MorningBriefingContent = {
  greeting: string;
  date: string;
  /** Collapsed-card teaser. Missing on pre-066 rows — fall back to headline. */
  teaser?: string;
  headline: string;
  /** Expanded modal prose. Missing on pre-066 rows — fall back to headline. */
  summary?: string;
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

const CATEGORY_HREFS: Record<string, string> = {
  Tasks: "/tasks",
  Projects: "/projects",
  Leads: "/leads",
  Goals: "/goals",
  Content: "/content",
  Properties: "/properties/dashboard",
};

const URGENCIES = new Set(["high", "medium", "low"]);

export type GenerateBriefingOptions = {
  userId: string;
  displayName: string;
  gender?: UserGender | null;
  greetingTerm?: string | null;
  context: BriefingContext;
  timezone: string;
};

export async function generateMorningBriefing(
  options: GenerateBriefingOptions
): Promise<MorningBriefingContent> {
  const {
    userId,
    displayName,
    gender,
    greetingTerm,
    context,
    timezone,
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

  const systemPrompt = `You are Winston, WISK's AI business assistant. You are generating a morning briefing for someone you address as "${term}" (display name on file: ${displayName}). Be confident, direct, and premium — warm without being corporate or cheesy. Never use filler phrases like "Certainly!" or "Great question!".

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

  const userPrompt = `Today is ${dateLabel}.

Business context:
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
      max_tokens: 1200,
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
