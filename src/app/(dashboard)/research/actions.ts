"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess, hasResearchAccess } from "@/lib/billing/access";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import { logExternalUsage } from "@/lib/ai/usage-logger";
import type { Lead } from "@/lib/leads/types";
import { searchGooglePlaces } from "@/lib/research/google-places";
import { getResearchCompetitorCap, loadResearchCompetitors } from "@/lib/research/data";
import type {
  ResearchActionResult,
  ResearchPageData,
  ResearchPlaceMatch,
} from "@/lib/research/types";
import {
  RESEARCH_WIN_RATE_PERIODS,
  buildResearchWinRateDashboard,
  type ResearchWinRateDashboard,
  type ResearchWinRatePeriod,
} from "@/lib/research/win-rate";
import { createAdminClient } from "@/lib/supabase/admin";

const GOOGLE_PLACES_LOOKUP_ESTIMATED_COST_USD = 0.017;

const addCompetitorSchema = z.object({
  name: z.string().trim().min(1, "Competitor name is required"),
  url: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  googlePlaceId: z.string().trim().optional(),
  googlePlaceLabel: z.string().trim().optional(),
});

const removeCompetitorSchema = z.object({
  competitorId: z.string().uuid(),
});

const placeSearchSchema = z.object({
  query: z.string().trim().min(2, "Enter at least 2 characters"),
});

const winRatePeriodSchema = z.object({
  period: z.enum(RESEARCH_WIN_RATE_PERIODS),
});

function revalidateResearchPaths() {
  revalidatePath("/research");
  revalidatePath("/");
}

async function assertResearchAccess(userId: string) {
  const admin = createAdminClient();
  const allowed = await hasResearchAccess(userId, admin);
  if (!allowed) {
    throw new Error("Research is not enabled for this account.");
  }

  const canAccessResearchPro = await hasPackageAccess(userId, "research_pro", admin);
  return { admin, canAccessResearchPro };
}

async function loadLeadsForWinRate(
  userId: string
): Promise<Lead[]> {
  const { supabase } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, user_id, name, email, phone, source, service_interest, status, value, value_type, notes, contacted_at, follow_up_date, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Lead[];
}

export async function getResearchPageData(): Promise<ResearchPageData | null> {
  const { userId } = await getScopedSupabase();
  const { admin, canAccessResearchPro } = await assertResearchAccess(userId);

  const [competitors, leads] = await Promise.all([
    loadResearchCompetitors(admin, userId),
    loadLeadsForWinRate(userId),
  ]);

  return {
    canAccessResearchPro,
    competitorCap: getResearchCompetitorCap(canAccessResearchPro),
    competitors,
    winRate: buildResearchWinRateDashboard(leads, "this_month"),
  };
}

export async function getResearchWinRateDashboard(
  period: ResearchWinRatePeriod
): Promise<ResearchActionResult<ResearchWinRateDashboard>> {
  const parsed = winRatePeriodSchema.safeParse({ period });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid period",
    };
  }

  try {
    const { userId } = await getScopedSupabase();
    await assertResearchAccess(userId);
    const leads = await loadLeadsForWinRate(userId);
    return {
      success: true,
      data: buildResearchWinRateDashboard(leads, parsed.data.period),
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not load win-rate analytics."),
    };
  }
}

export async function searchResearchCompetitorPlaces(
  query: string
): Promise<ResearchActionResult<ResearchPlaceMatch[]>> {
  const parsed = placeSearchSchema.safeParse({ query });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid search query",
    };
  }

  try {
    const { userId } = await getScopedSupabase();
    await assertResearchAccess(userId);
    const results = await searchGooglePlaces(parsed.data.query);
    await logExternalUsage({
      userId,
      feature: "research_place_lookup",
      provider: "google_places",
      estimatedCostUSD: GOOGLE_PLACES_LOOKUP_ESTIMATED_COST_USD,
      metadata: { query: parsed.data.query, resultCount: results.length },
    });
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not search Google Places."),
    };
  }
}

export async function addResearchCompetitor(input: {
  name: string;
  url?: string;
  googlePlaceId?: string;
  googlePlaceLabel?: string;
}): Promise<ResearchActionResult> {
  const parsed = addCompetitorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid competitor",
    };
  }

  try {
    const { supabase, userId } = await getScopedSupabase();
    const { admin, canAccessResearchPro } = await assertResearchAccess(userId);
    const cap = getResearchCompetitorCap(canAccessResearchPro);

    const { count, error: countError } = await supabase
      .from("research_competitors")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) >= cap) {
      return {
        success: false,
        error: `You've reached the ${cap}-competitor watchlist limit for this plan.`,
      };
    }

    const { error } = await supabase.from("research_competitors").insert({
      user_id: userId,
      name: parsed.data.name,
      url: parsed.data.url?.trim() || null,
      google_place_id: parsed.data.googlePlaceId?.trim() || null,
      google_place_label: parsed.data.googlePlaceLabel?.trim() || null,
    });

    if (error) {
      throw error;
    }

    // Warm the research page query path with admin permissions for consistency.
    await loadResearchCompetitors(admin, userId);
    revalidateResearchPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not add this competitor."),
    };
  }
}

export async function removeResearchCompetitor(
  competitorId: string
): Promise<ResearchActionResult> {
  const parsed = removeCompetitorSchema.safeParse({ competitorId });
  if (!parsed.success) {
    return { success: false, error: "Invalid competitor." };
  }

  try {
    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { error } = await supabase
      .from("research_competitors")
      .delete()
      .eq("id", parsed.data.competitorId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    revalidateResearchPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not remove this competitor."),
    };
  }
}
