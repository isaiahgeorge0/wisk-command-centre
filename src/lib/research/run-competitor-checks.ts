import { logExternalUsage } from "@/lib/ai/usage-logger";
import { getGooglePlaceSnapshot } from "@/lib/research/google-places";
import {
  buildTavilySnapshot,
  diffGooglePlaceSnapshot,
  diffTavilySnapshot,
} from "@/lib/research/monitoring";
import { searchTavily } from "@/lib/research/tavily";
import type {
  ResearchCompetitor,
  ResearchCompetitorCheck,
} from "@/lib/research/types";
import { createAdminClient } from "@/lib/supabase/admin";

const RESEARCH_PACKAGES = ["research", "research_pro", "max"] as const;
const TAVILY_CHECK_ESTIMATED_COST_USD = 0.001;
const GOOGLE_PLACES_CHECK_ESTIMATED_COST_USD = 0.034;

type RunSummary = {
  eligibleUsers: number;
  competitorsChecked: number;
  checksCreated: number;
  signalsCreated: number;
  failed: number;
};

function coerceObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function runCompetitorChecks(): Promise<RunSummary> {
  const admin = createAdminClient();
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("user_subscriptions")
    .select("user_id, package")
    .in("package", [...RESEARCH_PACKAGES])
    .in("status", ["active", "trialing"]);

  if (subscriptionsError) {
    throw subscriptionsError;
  }

  const eligibleUserIds = [...new Set((subscriptions ?? []).map((row) => row.user_id))];
  if (eligibleUserIds.length === 0) {
    return {
      eligibleUsers: 0,
      competitorsChecked: 0,
      checksCreated: 0,
      signalsCreated: 0,
      failed: 0,
    };
  }

  const { data: competitors, error: competitorsError } = await admin
    .from("research_competitors")
    .select("*")
    .in("user_id", eligibleUserIds)
    .order("created_at", { ascending: false });

  if (competitorsError) {
    throw competitorsError;
  }

  const competitorRows = (competitors ?? []) as ResearchCompetitor[];
  if (competitorRows.length === 0) {
    return {
      eligibleUsers: eligibleUserIds.length,
      competitorsChecked: 0,
      checksCreated: 0,
      signalsCreated: 0,
      failed: 0,
    };
  }

  const { data: existingChecks, error: checksError } = await admin
    .from("research_competitor_checks")
    .select("*")
    .in(
      "competitor_id",
      competitorRows.map((competitor) => competitor.id)
    )
    .order("checked_at", { ascending: false });

  if (checksError) {
    throw checksError;
  }

  const latestByKey = new Map<string, ResearchCompetitorCheck>();
  for (const check of (existingChecks ?? []) as ResearchCompetitorCheck[]) {
    const key = `${check.competitor_id}:${check.source}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, check);
    }
  }

  let checksCreated = 0;
  let signalsCreated = 0;
  let failed = 0;

  for (const competitor of competitorRows) {
    try {
      const tavilyResults = await searchTavily({
        query: [competitor.name, competitor.url, "pricing reviews updates"].filter(Boolean).join(" "),
        searchDepth: "basic",
        maxResults: 5,
      });

      const tavilySnapshot = buildTavilySnapshot(tavilyResults);
      const previousTavily = coerceObject(
        latestByKey.get(`${competitor.id}:tavily`)?.snapshot
      ) as
        | {
            urls?: string[];
            titles?: string[];
            pricingMentions?: number;
            reviewMentions?: number;
          }
        | null;
      const tavilyDiff = diffTavilySnapshot({
        previous: previousTavily
          ? {
              urls: Array.isArray(previousTavily.urls)
                ? previousTavily.urls.filter((value): value is string => typeof value === "string")
                : [],
              titles: Array.isArray(previousTavily.titles)
                ? previousTavily.titles.filter((value): value is string => typeof value === "string")
                : [],
              pricingMentions:
                typeof previousTavily.pricingMentions === "number"
                  ? previousTavily.pricingMentions
                  : 0,
              reviewMentions:
                typeof previousTavily.reviewMentions === "number"
                  ? previousTavily.reviewMentions
                  : 0,
            }
          : null,
        current: tavilySnapshot,
      });

      await admin.from("research_competitor_checks").insert({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        source: "tavily",
        snapshot: tavilySnapshot,
        has_meaningful_change: tavilyDiff.meaningful,
        change_summary: tavilyDiff.summary,
        urgency: tavilyDiff.urgency,
      });
      checksCreated += 1;
      if (tavilyDiff.meaningful) signalsCreated += 1;
      await logExternalUsage({
        userId: competitor.user_id,
        feature: "research_competitor_check",
        provider: "tavily",
        estimatedCostUSD: TAVILY_CHECK_ESTIMATED_COST_USD,
        metadata: { competitorId: competitor.id, source: "tavily" },
      });

      if (competitor.google_place_id) {
        const googleSnapshot = await getGooglePlaceSnapshot({
          placeId: competitor.google_place_id,
          searchName: competitor.name,
        });
        const previousGoogle = coerceObject(
          latestByKey.get(`${competitor.id}:google_places`)?.snapshot
        ) as
          | {
              placeId?: string;
              displayName?: string;
              formattedAddress?: string;
              rating?: number;
              userRatingCount?: number;
              websiteUri?: string | null;
              latestReviewSnippet?: string | null;
              locationMatchCount?: number;
            }
          | null;
        const googleDiff = diffGooglePlaceSnapshot({
          previous: previousGoogle
            ? {
                placeId:
                  typeof previousGoogle.placeId === "string"
                    ? previousGoogle.placeId
                    : competitor.google_place_id,
                displayName:
                  typeof previousGoogle.displayName === "string"
                    ? previousGoogle.displayName
                    : competitor.name,
                formattedAddress:
                  typeof previousGoogle.formattedAddress === "string"
                    ? previousGoogle.formattedAddress
                    : "",
                rating:
                  typeof previousGoogle.rating === "number"
                    ? previousGoogle.rating
                    : null,
                userRatingCount:
                  typeof previousGoogle.userRatingCount === "number"
                    ? previousGoogle.userRatingCount
                    : null,
                websiteUri:
                  typeof previousGoogle.websiteUri === "string"
                    ? previousGoogle.websiteUri
                    : null,
                latestReviewSnippet:
                  typeof previousGoogle.latestReviewSnippet === "string"
                    ? previousGoogle.latestReviewSnippet
                    : null,
                locationMatchCount:
                  typeof previousGoogle.locationMatchCount === "number"
                    ? previousGoogle.locationMatchCount
                    : 0,
              }
            : null,
          current: googleSnapshot,
        });

        await admin.from("research_competitor_checks").insert({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          source: "google_places",
          snapshot: googleSnapshot,
          has_meaningful_change: googleDiff.meaningful,
          change_summary: googleDiff.summary,
          urgency: googleDiff.urgency,
        });
        checksCreated += 1;
        if (googleDiff.meaningful) signalsCreated += 1;
        await logExternalUsage({
          userId: competitor.user_id,
          feature: "research_competitor_check",
          provider: "google_places",
          estimatedCostUSD: GOOGLE_PLACES_CHECK_ESTIMATED_COST_USD,
          metadata: { competitorId: competitor.id, source: "google_places" },
        });
      }
    } catch (error) {
      failed += 1;
      console.error("[research/competitor-checks]", competitor.id, error);
    }
  }

  return {
    eligibleUsers: eligibleUserIds.length,
    competitorsChecked: competitorRows.length,
    checksCreated,
    signalsCreated,
    failed,
  };
}
