import type { FocusSignal } from "@/lib/overview/focus-signals";
import type { TavilySearchResult } from "@/lib/research/tavily";
import type {
  ResearchCheckUrgency,
  ResearchCompetitor,
  ResearchCompetitorCheck,
  ResearchSignal,
} from "@/lib/research/types";
import type { GooglePlaceSnapshot } from "@/lib/research/google-places";

export const RESEARCH_COMPETITOR_CAP = 5;
export const RESEARCH_PRO_COMPETITOR_CAP = 15;

type TavilySnapshot = {
  urls: string[];
  titles: string[];
  pricingMentions: number;
  reviewMentions: number;
};

function snippetIncludesKeywords(
  result: TavilySearchResult,
  keywords: string[]
): boolean {
  const haystack = `${result.title} ${result.content}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function buildTavilySnapshot(
  results: TavilySearchResult[]
): TavilySnapshot {
  return {
    urls: results.map((result) => result.url).slice(0, 5),
    titles: results.map((result) => result.title).slice(0, 5),
    pricingMentions: results.filter((result) =>
      snippetIncludesKeywords(result, ["pricing", "price", "quote"])
    ).length,
    reviewMentions: results.filter((result) =>
      snippetIncludesKeywords(result, ["review", "rating", "customer"])
    ).length,
  };
}

export function diffTavilySnapshot(input: {
  previous: TavilySnapshot | null;
  current: TavilySnapshot;
}): {
  meaningful: boolean;
  summary: string | null;
  urgency: ResearchCheckUrgency | null;
} {
  const { previous, current } = input;
  if (!previous) {
    return { meaningful: false, summary: null, urgency: null };
  }

  const newUrls = current.urls.filter((url) => !previous.urls.includes(url));
  const pricingShift =
    current.pricingMentions !== previous.pricingMentions &&
    (current.pricingMentions > 0 || previous.pricingMentions > 0);
  const reviewShift =
    current.reviewMentions - previous.reviewMentions >= 2;

  if (pricingShift) {
    return {
      meaningful: true,
      summary: "Public web change, pricing-related results shifted.",
      urgency: "high",
    };
  }

  if (newUrls.length >= 2) {
    return {
      meaningful: true,
      summary: "Public web change, multiple new pages or updates appeared.",
      urgency: "medium",
    };
  }

  if (reviewShift) {
    return {
      meaningful: true,
      summary: "Public web change, review activity mentions increased.",
      urgency: "medium",
    };
  }

  return { meaningful: false, summary: null, urgency: null };
}

export function diffGooglePlaceSnapshot(input: {
  previous: GooglePlaceSnapshot | null;
  current: GooglePlaceSnapshot;
}): {
  meaningful: boolean;
  summary: string | null;
  urgency: ResearchCheckUrgency | null;
} {
  const { previous, current } = input;
  if (!previous) {
    return { meaningful: false, summary: null, urgency: null };
  }

  if (
    previous.rating != null &&
    current.rating != null &&
    Math.abs(current.rating - previous.rating) >= 0.1
  ) {
    return {
      meaningful: true,
      summary: `Map listing rating change, ${previous.rating.toFixed(1)} to ${current.rating.toFixed(1)}.`,
      urgency: current.rating < previous.rating ? "high" : "medium",
    };
  }

  if (
    previous.userRatingCount != null &&
    current.userRatingCount != null &&
    current.userRatingCount - previous.userRatingCount >= 3
  ) {
    return {
      meaningful: true,
      summary: `Map listing review count increased by ${current.userRatingCount - previous.userRatingCount}.`,
      urgency: "medium",
    };
  }

  if (current.locationMatchCount > previous.locationMatchCount) {
    return {
      meaningful: true,
      summary: "Map listing location change, additional matching location detected.",
      urgency: "medium",
    };
  }

  return { meaningful: false, summary: null, urgency: null };
}

export function researchCheckToSignal(
  competitor: ResearchCompetitor,
  check: ResearchCompetitorCheck
): ResearchSignal | null {
  if (!check.has_meaningful_change || !check.change_summary || !check.urgency) {
    return null;
  }

  return {
    checkId: check.id,
    competitorId: competitor.id,
    competitorName: competitor.name,
    source: check.source,
    summary: check.change_summary,
    detail:
      check.source === "tavily"
        ? "Source: public web"
        : "Source: map listing",
    urgency: check.urgency,
    checkedAt: check.checked_at,
  };
}

export function researchSignalToFocusSignal(
  signal: ResearchSignal
): FocusSignal {
  return {
    id: `research-${signal.checkId}`,
    category: "research",
    label: `${signal.competitorName}, ${signal.summary}`,
    detail: signal.detail,
    href: "/research",
    urgency: signal.urgency,
  };
}
