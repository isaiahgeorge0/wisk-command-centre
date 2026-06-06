import { PIPELINE_STATUSES } from "@/lib/content/constants";
import { todayDateISO } from "@/lib/content/format";
import { getPostPlatforms } from "@/lib/content/platforms";
import type {
  ContentCalendarEntry,
  ContentPlatform,
  ContentPost,
  ContentStatus,
} from "@/lib/content/types";
import {
  addDaysToISO,
  compareDateISO,
  isWithinNext7Days,
  toDateISO,
} from "@/lib/overview/date";

export type ContentStats = {
  publishedThisMonth: number;
  scheduledUpcoming: number;
  inProgress: number;
  streak: number;
  platformBreakdown: { platform: ContentPlatform; count: number }[];
};

export function groupPostsByStatus(
  posts: ContentPost[]
): Record<ContentStatus, ContentPost[]> {
  const grouped = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, [] as ContentPost[]])
  ) as Record<ContentStatus, ContentPost[]>;

  for (const post of posts) {
    const status = PIPELINE_STATUSES.includes(post.status as ContentStatus)
      ? (post.status as ContentStatus)
      : "idea";
    grouped[status].push(post);
  }

  for (const status of PIPELINE_STATUSES) {
    grouped[status].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  return grouped;
}

export function buildContentStats(
  posts: ContentPost[],
  now: Date = new Date()
): ContentStats {
  const todayISO = todayDateISO(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartISO = toDateISO(monthStart);

  const publishedThisMonth = posts.filter(
    (post) =>
      post.status === "published" &&
      post.published_date &&
      compareDateISO(post.published_date, monthStartISO) >= 0
  ).length;

  const scheduledUpcoming = posts.filter(
    (post) =>
      post.status === "scheduled" &&
      post.scheduled_date &&
      compareDateISO(post.scheduled_date, todayISO) >= 0
  ).length;

  const inProgress = posts.filter((post) => post.status === "in_progress").length;
  const streak = computeContentStreak(posts, now);
  const platformBreakdown = buildPlatformBreakdown(posts);

  return {
    publishedThisMonth,
    scheduledUpcoming,
    inProgress,
    streak,
    platformBreakdown,
  };
}

export function buildPlatformBreakdown(
  posts: ContentPost[]
): { platform: ContentPlatform; count: number }[] {
  const counts = new Map<ContentPlatform, number>();

  for (const post of posts) {
    for (const platform of getPostPlatforms(post)) {
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform));
}

export function computeContentStreak(
  posts: ContentPost[],
  now: Date = new Date()
): number {
  const publishedDates = new Set(
    posts
      .filter((post) => post.status === "published" && post.published_date)
      .map((post) => post.published_date as string)
  );

  if (publishedDates.size === 0) return 0;

  let streak = 0;
  let cursor = todayDateISO(now);

  while (publishedDates.has(cursor)) {
    streak += 1;
    cursor = addDaysToISO(cursor, -1);
  }

  return streak;
}

function expandRecurringDates(
  startDate: string,
  rule: string,
  endDate: string | null
): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);

  // Cap at 1 year from today to prevent runaway expansion
  const cap = new Date();
  cap.setFullYear(cap.getFullYear() + 1);

  const end = endDate
    ? (() => { const [y, m, d] = endDate.split("-").map(Number); return new Date(y, m - 1, d); })()
    : cap;

  const limit = end < cap ? end : cap;
  const current = new Date(start);

  while (current <= limit) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);

    if (rule === "daily") current.setDate(current.getDate() + 1);
    else if (rule === "weekly") current.setDate(current.getDate() + 7);
    else if (rule === "monthly") current.setMonth(current.getMonth() + 1);
    else break;
  }

  return dates;
}

export function buildContentCalendarEntries(
  posts: ContentPost[]
): ContentCalendarEntry[] {
  const entries: ContentCalendarEntry[] = [];

  for (const post of posts) {
    if (post.status === "published" && post.published_date) {
      entries.push({
        post,
        date: post.published_date,
        kind: "published",
      });
      continue;
    }

    if (
      post.scheduled_date &&
      ["idea", "planned", "in_progress", "scheduled"].includes(post.status)
    ) {
      if (post.recurrence_rule) {
        const dates = expandRecurringDates(
          post.scheduled_date,
          post.recurrence_rule,
          post.recurrence_end_date ?? null
        );
        for (const date of dates) {
          entries.push({
            post,
            date,
            kind: "scheduled",
            isRecurring: true,
            occurrenceDate: date,
          });
        }
      } else {
        entries.push({
          post,
          date: post.scheduled_date,
          kind: "scheduled",
        });
      }
    }
  }

  return entries;
}

export function contentEntriesByDate(
  entries: ContentCalendarEntry[]
): Map<string, ContentCalendarEntry[]> {
  const map = new Map<string, ContentCalendarEntry[]>();

  for (const entry of entries) {
    const existing = map.get(entry.date) ?? [];
    existing.push(entry);
    map.set(entry.date, existing);
  }

  for (const [date, dayEntries] of map) {
    map.set(
      date,
      dayEntries.sort((a, b) => a.post.title.localeCompare(b.post.title))
    );
  }

  return map;
}

export function getPostsDueThisWeek(
  posts: ContentPost[],
  todayISO: string,
  weekEndISO: string
): { date: string; posts: ContentPost[] }[] {
  const due = posts.filter(
    (post) =>
      post.scheduled_date &&
      ["planned", "in_progress", "scheduled"].includes(post.status) &&
      isWithinNext7Days(post.scheduled_date, todayISO, weekEndISO)
  );

  const map = new Map<string, ContentPost[]>();
  for (const post of due) {
    if (!post.scheduled_date) continue;
    const existing = map.get(post.scheduled_date) ?? [];
    existing.push(post);
    map.set(post.scheduled_date, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, grouped]) => ({ date, posts: grouped }));
}

export function getPublishedCountByGoalId(
  posts: ContentPost[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const post of posts) {
    if (post.status !== "published" || !post.goal_id) continue;
    counts[post.goal_id] = (counts[post.goal_id] ?? 0) + 1;
  }

  return counts;
}

export function filterContentGoals<T extends { id: string; category: string | null }>(
  goals: T[]
): T[] {
  return goals.filter((goal) => goal.category === "Content");
}
