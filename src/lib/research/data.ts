import type { SupabaseClient } from "@supabase/supabase-js";

import {
  RESEARCH_COMPETITOR_CAP,
  RESEARCH_PRO_COMPETITOR_CAP,
  researchCheckToSignal,
} from "@/lib/research/monitoring";
import type {
  ResearchCompetitor,
  ResearchCompetitorCheck,
  ResearchCompetitorListItem,
  ResearchSignal,
} from "@/lib/research/types";

export function getResearchCompetitorCap(canAccessResearchPro: boolean): number {
  return canAccessResearchPro
    ? RESEARCH_PRO_COMPETITOR_CAP
    : RESEARCH_COMPETITOR_CAP;
}

export async function loadResearchCompetitors(
  supabase: SupabaseClient,
  userId: string
): Promise<ResearchCompetitorListItem[]> {
  const { data: competitors, error: competitorsError } = await supabase
    .from("research_competitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (competitorsError) {
    throw new Error(competitorsError.message);
  }

  const competitorRows = (competitors ?? []) as ResearchCompetitor[];
  if (competitorRows.length === 0) return [];

  const { data: checks, error: checksError } = await supabase
    .from("research_competitor_checks")
    .select("*")
    .eq("user_id", userId)
    .in(
      "competitor_id",
      competitorRows.map((competitor) => competitor.id)
    )
    .order("checked_at", { ascending: false });

  if (checksError) {
    throw new Error(checksError.message);
  }

  const checksByCompetitor = new Map<string, ResearchCompetitorCheck[]>();
  for (const check of (checks ?? []) as ResearchCompetitorCheck[]) {
    const bucket = checksByCompetitor.get(check.competitor_id) ?? [];
    bucket.push(check);
    checksByCompetitor.set(check.competitor_id, bucket);
  }

  return competitorRows.map((competitor) => {
    const competitorChecks = checksByCompetitor.get(competitor.id) ?? [];
    const latestMeaningfulSignals = competitorChecks
      .filter((check) => check.has_meaningful_change)
      .slice(0, 3)
      .map((check) => researchCheckToSignal(competitor, check))
      .filter((signal): signal is ResearchSignal => Boolean(signal));

    return {
      competitor,
      latestChecks: competitorChecks.slice(0, 2),
      latestMeaningfulSignals,
    };
  });
}

export async function loadResearchFocusSignals(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 7
): Promise<ResearchSignal[]> {
  const competitors = await loadResearchCompetitors(supabase, userId);
  const cutoff = Date.now() - windowDays * 86_400_000;

  return competitors
    .flatMap((item) => item.latestMeaningfulSignals.slice(0, 1))
    .filter((signal) => new Date(signal.checkedAt).getTime() >= cutoff);
}
