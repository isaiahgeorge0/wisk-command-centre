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
import { detectCompetitorTechStack } from "@/lib/research/tech-stack";
import type {
  ResearchActionResult,
  ResearchCompetitor,
  ResearchCompetitorTechStack,
  ResearchLeadIntelligenceData,
  ResearchOverviewStats,
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

const techStackCompetitorSchema = z.object({
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
  revalidatePath("/research/watchlist");
  revalidatePath("/research/win-rate");
  revalidatePath("/research/chat");
  revalidatePath("/research/leads");
  revalidatePath("/research/signals");
  revalidatePath("/research/documents");
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
  try {
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
  } catch (error) {
    console.error("getResearchPageData failed:", error);
    return null;
  }
}

export async function getResearchOverviewStats(): Promise<ResearchOverviewStats | null> {
  try {
    const { supabase, userId } = await getScopedSupabase();
    const { admin, canAccessResearchPro } = await assertResearchAccess(userId);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    const [
      competitors,
      leads,
      briefsThisMonthResult,
      briefsTotalResult,
      leadsWithoutBriefResult,
    ] = await Promise.all([
      loadResearchCompetitors(admin, userId),
      loadLeadsForWinRate(userId),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("research_brief_generated_at", monthStartISO),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("research_brief_generated_at", "is", null),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("research_brief_generated_at", null),
    ]);

    const winRate = buildResearchWinRateDashboard(leads, "this_month");
    const signalCount = competitors.reduce(
      (sum, item) => sum + item.latestMeaningfulSignals.length,
      0
    );

    return {
      canAccessResearchPro,
      competitorCap: getResearchCompetitorCap(canAccessResearchPro),
      competitorCount: competitors.length,
      signalCount,
      winRatePercent: winRate.winRatePercent,
      winRatePeriodLabel: winRate.periodLabel,
      briefsThisMonth: briefsThisMonthResult.count ?? 0,
      briefsTotal: briefsTotalResult.count ?? 0,
      leadsWithoutBrief: leadsWithoutBriefResult.count ?? 0,
    };
  } catch (error) {
    console.error("getResearchOverviewStats failed:", error);
    return null;
  }
}

export async function getResearchLeadIntelligence(): Promise<ResearchLeadIntelligenceData | null> {
  try {
    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    const [
      briefsResult,
      briefsThisMonthResult,
      briefsTotalResult,
      leadsWithoutBriefResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, name, status, service_interest, research_brief_summary, research_brief_generated_at"
        )
        .eq("user_id", userId)
        .not("research_brief_generated_at", "is", null)
        .order("research_brief_generated_at", { ascending: false })
        .limit(50),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("research_brief_generated_at", monthStartISO),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("research_brief_generated_at", "is", null),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("research_brief_generated_at", null),
    ]);

    if (briefsResult.error) {
      throw briefsResult.error;
    }

    return {
      briefsThisMonth: briefsThisMonthResult.count ?? 0,
      briefsTotal: briefsTotalResult.count ?? 0,
      leadsWithoutBrief: leadsWithoutBriefResult.count ?? 0,
      briefs: (briefsResult.data ?? []).map((row) => ({
        id: row.id as string,
        name: (row.name as string) || "Untitled lead",
        status: (row.status as string) || "new",
        serviceInterest: (row.service_interest as string) || "",
        summary:
          typeof row.research_brief_summary === "string"
            ? row.research_brief_summary
            : null,
        generatedAt: row.research_brief_generated_at as string,
      })),
    };
  } catch (error) {
    console.error("getResearchLeadIntelligence failed:", error);
    return null;
  }
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

export async function checkCompetitorTechStack(
  competitorId: string
): Promise<ResearchActionResult<ResearchCompetitorTechStack>> {
  const parsed = techStackCompetitorSchema.safeParse({ competitorId });
  if (!parsed.success) {
    return { success: false, error: "Invalid competitor." };
  }

  try {
    const { supabase, userId } = await getScopedSupabase();
    await assertResearchAccess(userId);

    const { data: row, error: fetchError } = await supabase
      .from("research_competitors")
      .select("*")
      .eq("id", parsed.data.competitorId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError || !row) {
      return { success: false, error: "Competitor not found." };
    }

    const competitor = row as ResearchCompetitor;
    const techStack = await detectCompetitorTechStack({
      userId,
      competitor,
    });

    const { error: updateError } = await supabase
      .from("research_competitors")
      .update({
        tech_stack: techStack,
        tech_stack_checked_at: techStack.checkedAt,
      })
      .eq("id", competitor.id)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath("/research/watchlist");
    revalidatePath("/research");
    return { success: true, data: techStack };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not check this competitor's tech stack."
      ),
    };
  }
}

const appendLeadNotesSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().trim().min(1).max(20000),
});

export async function listLeadsForResearchNotes(): Promise<
  ResearchActionResult<Array<{ id: string; name: string }>>
> {
  try {
    const { supabase, userId } = await getScopedSupabase();
    const { canAccessResearchPro } = await assertResearchAccess(userId);
    if (!canAccessResearchPro) {
      return {
        success: false,
        error: "Adding research findings to leads needs WISK Research Pro.",
      };
    }

    const { data, error } = await supabase
      .from("leads")
      .select("id, name")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        name: (row.name as string) || "Untitled lead",
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not load leads."),
    };
  }
}

/**
 * Append a research chat finding to a lead's notes.
 * Talking points don't map cleanly to WinstonProposal entityTypes (tasks/ideas
 * have no lead_id), so this explicit append is the honest path.
 */
export async function appendResearchFindingToLead(input: {
  leadId: string;
  content: string;
}): Promise<ResearchActionResult> {
  const parsed = appendLeadNotesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const { supabase, userId } = await getScopedSupabase();
    const { canAccessResearchPro } = await assertResearchAccess(userId);
    if (!canAccessResearchPro) {
      return {
        success: false,
        error: "Adding research findings to leads needs WISK Research Pro.",
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from("leads")
      .select("id, notes")
      .eq("id", parsed.data.leadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError || !existing) {
      return { success: false, error: "Lead not found" };
    }

    const timestamp = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const entry = `\n\n---\nWinston research notes (${timestamp})\n${parsed.data.content.trim()}`;
    const currentNotes =
      typeof existing.notes === "string" ? existing.notes.trim() : "";
    const notes = currentNotes
      ? `${currentNotes}${entry}`
      : parsed.data.content.trim();

    const { error: updateError } = await supabase
      .from("leads")
      .update({ notes })
      .eq("id", parsed.data.leadId)
      .eq("user_id", userId);

    if (updateError) {
      return {
        success: false,
        error: toSafeActionError(
          updateError,
          "Could not save research notes to this lead."
        ),
      };
    }

    revalidatePath("/leads");
    revalidatePath("/research");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not save research notes to this lead."
      ),
    };
  }
}
