import { ACTIVE_PIPELINE_STATUSES, PIPELINE_STATUSES } from "@/lib/leads/constants";
import {
  annualizeLeadValue,
  formatPipelineValueSplit,
  normalizeLeadValueType,
  sumLeadValuesByType,
} from "@/lib/leads/format";
import type {
  LeadValueType,
  PipelineHealthFocus,
  PipelineValueSplit,
  LeadStatus,
} from "@/lib/leads/types";
import { toDateISO } from "@/lib/overview/date";
import { createAdminClient } from "@/lib/supabase/admin";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEFAULT_STALLED_DAYS = 14;
const DEFAULT_CONVERSION_WINDOW_DAYS = 90;
const DEFAULT_TREND_WINDOW_DAYS = 30;

type LeadRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  value: number | null;
  value_type: string | null;
  follow_up_date: string | null;
  created_at: string;
};

type LeadActivityRow = {
  lead_id: string;
  activity_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PipelineHealthLeadMetric = {
  leadId: string;
  leadName: string;
  currentStage: LeadStatus;
  daysSinceLastActivity: number;
  daysInCurrentStage: number;
  value: number | null;
  valueType: LeadValueType;
  followUpDate: string | null;
  reasons: string[];
  urgency: "high" | "medium" | "low";
};

export type StageConversionMetric = {
  fromStage: LeadStatus;
  toStage: LeadStatus;
  totalTransitions: number;
  progressedCount: number;
  ratePercent: number;
};

export type TrendMetric = {
  current: number;
  previous: number;
  delta: number;
};

export type PipelineHealthMetrics = {
  generatedAt: string;
  stalledDaysThreshold: number;
  conversionWindowDays: number;
  trendWindowDays: number;
  stalledLeads: PipelineHealthLeadMetric[];
  valueAtRisk: PipelineValueSplit;
  /** Pre-formatted two-figure label from source data. */
  valueAtRiskLabel: string;
  averageDaysInStage: number | null;
  stageConversionRates: StageConversionMetric[];
  trends: {
    conversionRate: TrendMetric;
    /** Annualized pipeline value of leads created in each period. */
    pipelineValue: TrendMetric;
  };
};

function isLeadStatus(value: string): value is LeadStatus {
  return PIPELINE_STATUSES.includes(value as LeadStatus);
}

function normalizeLeadStatus(value: string): LeadStatus {
  return isLeadStatus(value) ? value : "new";
}

function daysBetween(anchor: string, now = new Date()): number {
  const anchorIso = toDateISO(new Date(anchor));
  const todayIso = toDateISO(now);
  const from = new Date(`${anchorIso}T12:00:00`);
  const to = new Date(`${todayIso}T12:00:00`);
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY));
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildTrendMetric(current: number, previous: number): TrendMetric {
  return {
    current,
    previous,
    delta: current - previous,
  };
}

function buildPeriodLeadStats(leads: LeadRow[]) {
  const won = leads.filter((lead) => lead.status === "won").length;
  const lost = leads.filter((lead) => lead.status === "lost").length;
  const closed = won + lost;
  const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
  // Annualize for trend comparison so monthly and one-time aren't blended raw.
  const pipelineValue = leads
    .filter((lead) =>
      ACTIVE_PIPELINE_STATUSES.includes(normalizeLeadStatus(lead.status))
    )
    .reduce(
      (sum, lead) => sum + annualizeLeadValue(lead.value, lead.value_type),
      0
    );

  return { conversionRate, pipelineValue };
}

function buildReasons(input: {
  leadName: string;
  stage: LeadStatus;
  daysSinceLastActivity: number;
  daysInCurrentStage: number;
  followUpDate: string | null;
  nowIso: string;
  stalledDays: number;
}): { reasons: string[]; urgency: "high" | "medium" | "low" } {
  const reasons: string[] = [];
  let urgency: "high" | "medium" | "low" = "low";

  if (input.followUpDate && input.followUpDate < input.nowIso) {
    reasons.push(`${input.leadName} has an overdue follow-up.`);
    urgency = "high";
  }

  if (input.daysSinceLastActivity >= input.stalledDays) {
    reasons.push(
      `No activity for ${input.daysSinceLastActivity} days (threshold ${input.stalledDays}).`
    );
    if (urgency === "low") {
      urgency = input.daysSinceLastActivity >= input.stalledDays + 7 ? "high" : "medium";
    }
  }

  if (input.daysInCurrentStage >= input.stalledDays) {
    reasons.push(
      `${input.leadName} has been in ${input.stage.replaceAll("_", " ")} for ${input.daysInCurrentStage} days.`
    );
    if (urgency === "low") {
      urgency = input.daysInCurrentStage >= input.stalledDays + 7 ? "high" : "medium";
    }
  }

  return { reasons, urgency };
}

function focusFromLead(lead: PipelineHealthLeadMetric): PipelineHealthFocus {
  return {
    leadId: lead.leadId,
    leadName: lead.leadName,
    value: lead.value,
    valueType: lead.valueType,
    issue: lead.reasons[0] ?? `${lead.leadName} needs attention.`,
    suggestedAction:
      lead.followUpDate && lead.followUpDate < toDateISO(new Date())
        ? "Schedule the overdue follow-up and make contact today."
        : lead.currentStage === "proposal_sent"
          ? "Send a short check-in and confirm the next decision point."
          : "Reach out, confirm the next step, and set a clear follow-up date.",
    urgency: lead.urgency,
  };
}

function buildFallbackFocuses(
  stalledLeads: PipelineHealthLeadMetric[],
  limit = 5
): PipelineHealthFocus[] {
  return stalledLeads.slice(0, limit).map(focusFromLead);
}

export async function buildPipelineHealthMetrics(
  userId: string,
  options?: {
    stalledDays?: number;
    conversionWindowDays?: number;
    trendWindowDays?: number;
  }
): Promise<PipelineHealthMetrics> {
  const stalledDays = options?.stalledDays ?? DEFAULT_STALLED_DAYS;
  const conversionWindowDays =
    options?.conversionWindowDays ?? DEFAULT_CONVERSION_WINDOW_DAYS;
  const trendWindowDays = options?.trendWindowDays ?? DEFAULT_TREND_WINDOW_DAYS;
  const admin = createAdminClient();
  const now = new Date();
  const todayIso = toDateISO(now);
  const conversionStartIso = addDays(startOfDay(now), -conversionWindowDays).toISOString();
  const trendLookbackStart = addDays(startOfDay(now), -(trendWindowDays * 2));
  // Bound activity history: conversion window needs 90d; keep a 1y ceiling for
  // "days since last activity" without loading forever-history.
  const activityLookbackDays = Math.max(conversionWindowDays, 365);
  const activitySinceIso = addDays(
    startOfDay(now),
    -activityLookbackDays
  ).toISOString();

  const leadSelect =
    "id, user_id, name, status, value, value_type, follow_up_date, created_at";

  const [
    { data: activeLeadData, error: activeLeadsError },
    { data: recentLeadData, error: recentLeadsError },
    { data: activities, error: activitiesError },
  ] = await Promise.all([
    admin
      .from("leads")
      .select(leadSelect)
      .eq("user_id", userId)
      .in("status", [...ACTIVE_PIPELINE_STATUSES]),
    admin
      .from("leads")
      .select(leadSelect)
      .eq("user_id", userId)
      .gte("created_at", trendLookbackStart.toISOString()),
    admin
      .from("lead_activities")
      .select("lead_id, activity_type, metadata, created_at")
      .eq("user_id", userId)
      .gte("created_at", activitySinceIso)
      .order("created_at", { ascending: false }),
  ]);

  if (activeLeadsError) {
    throw new Error(`Could not load leads: ${activeLeadsError.message}`);
  }
  if (recentLeadsError) {
    throw new Error(`Could not load recent leads: ${recentLeadsError.message}`);
  }
  if (activitiesError) {
    throw new Error(`Could not load lead activities: ${activitiesError.message}`);
  }

  const leadById = new Map<string, LeadRow>();
  for (const row of [
    ...(activeLeadData ?? []),
    ...(recentLeadData ?? []),
  ] as LeadRow[]) {
    leadById.set(row.id, row);
  }
  const leadRows = [...leadById.values()];
  const activityRows = (activities ?? []) as LeadActivityRow[];
  const activeLeads = leadRows.filter((lead) =>
    ACTIVE_PIPELINE_STATUSES.includes(normalizeLeadStatus(lead.status))
  );

  const latestActivityByLead = new Map<string, string>();
  const latestStageChangeByLead = new Map<string, string>();

  for (const activity of activityRows) {
    if (!latestActivityByLead.has(activity.lead_id)) {
      latestActivityByLead.set(activity.lead_id, activity.created_at);
    }
    if (
      activity.activity_type === "stage_change" &&
      !latestStageChangeByLead.has(activity.lead_id)
    ) {
      latestStageChangeByLead.set(activity.lead_id, activity.created_at);
    }
  }

  const stalledLeads = activeLeads
    .map((lead) => {
      const currentStage = normalizeLeadStatus(lead.status);
      const lastActivityAt = latestActivityByLead.get(lead.id) ?? lead.created_at;
      const lastStageChangeAt = latestStageChangeByLead.get(lead.id) ?? lead.created_at;
      const daysSinceLastActivity = daysBetween(lastActivityAt, now);
      const daysInCurrentStage = daysBetween(lastStageChangeAt, now);
      const { reasons, urgency } = buildReasons({
        leadName: lead.name,
        stage: currentStage,
        daysSinceLastActivity,
        daysInCurrentStage,
        followUpDate: lead.follow_up_date,
        nowIso: todayIso,
        stalledDays,
      });

      return {
        leadId: lead.id,
        leadName: lead.name,
        currentStage,
        daysSinceLastActivity,
        daysInCurrentStage,
        value: lead.value ?? null,
        valueType: normalizeLeadValueType(lead.value_type),
        followUpDate: lead.follow_up_date,
        reasons,
        urgency,
      } satisfies PipelineHealthLeadMetric;
    })
    .filter((lead) => lead.reasons.length > 0)
    .sort((a, b) => {
      const urgencyWeight = { high: 3, medium: 2, low: 1 };
      const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (weightDiff !== 0) return weightDiff;
      const aAnnual = annualizeLeadValue(a.value, a.valueType);
      const bAnnual = annualizeLeadValue(b.value, b.valueType);
      if (bAnnual !== aAnnual) return bAnnual - aAnnual;
      return b.daysSinceLastActivity - a.daysSinceLastActivity;
    });

  const valueAtRisk = sumLeadValuesByType(
    stalledLeads.map((lead) => ({
      value: lead.value,
      value_type: lead.valueType,
    }))
  );
  const valueAtRiskLabel = formatPipelineValueSplit(valueAtRisk);

  const averageDaysInStage =
    activeLeads.length > 0
      ? Math.round(
          (activeLeads.reduce((sum, lead) => {
            const lastStageChangeAt =
              latestStageChangeByLead.get(lead.id) ?? lead.created_at;
            return sum + daysBetween(lastStageChangeAt, now);
          }, 0) /
            activeLeads.length) *
            10
        ) / 10
      : null;

  const conversionRates: StageConversionMetric[] = [];
  for (let index = 0; index < ACTIVE_PIPELINE_STATUSES.length - 1; index += 1) {
    const fromStage = ACTIVE_PIPELINE_STATUSES[index];
    const toStage = ACTIVE_PIPELINE_STATUSES[index + 1];
    const relevant = activityRows.filter((activity) => {
      if (activity.activity_type !== "stage_change") return false;
      if (new Date(activity.created_at).toISOString() < conversionStartIso) return false;
      const from = activity.metadata?.from;
      return typeof from === "string" && from === fromStage;
    });

    const progressedCount = relevant.filter(
      (activity) => activity.metadata?.to === toStage
    ).length;
    const totalTransitions = relevant.length;
    const ratePercent =
      totalTransitions > 0 ? Math.round((progressedCount / totalTransitions) * 100) : 0;

    conversionRates.push({
      fromStage,
      toStage,
      totalTransitions,
      progressedCount,
      ratePercent,
    });
  }

  const currentPeriodStart = startOfDay(addDays(now, -trendWindowDays + 1));
  const previousPeriodStart = startOfDay(addDays(currentPeriodStart, -trendWindowDays));
  const previousPeriodEnd = currentPeriodStart;

  const currentPeriodLeads = leadRows.filter(
    (lead) => new Date(lead.created_at) >= currentPeriodStart
  );
  const previousPeriodLeads = leadRows.filter((lead) => {
    const createdAt = new Date(lead.created_at);
    return createdAt >= previousPeriodStart && createdAt < previousPeriodEnd;
  });

  const currentStats = buildPeriodLeadStats(currentPeriodLeads);
  const previousStats = buildPeriodLeadStats(previousPeriodLeads);

  return {
    generatedAt: now.toISOString(),
    stalledDaysThreshold: stalledDays,
    conversionWindowDays,
    trendWindowDays,
    stalledLeads,
    valueAtRisk,
    valueAtRiskLabel,
    averageDaysInStage,
    stageConversionRates: conversionRates,
    trends: {
      conversionRate: buildTrendMetric(
        currentStats.conversionRate,
        previousStats.conversionRate
      ),
      pipelineValue: buildTrendMetric(
        currentStats.pipelineValue,
        previousStats.pipelineValue
      ),
    },
  };
}

export function buildHealthyPipelineResult(generatedAt: string) {
  return {
    summary:
      "Your pipeline looks healthy right now. Nothing is sitting stale, no follow-ups are overdue, and there are no obvious gaps demanding urgent attention.",
    focuses: [] as PipelineHealthFocus[],
    valueAtRisk: { oneTime: 0, monthly: 0 },
    generatedAt,
  };
}

export function buildFallbackPipelineResult(
  metrics: PipelineHealthMetrics
): {
  summary: string;
  focuses: PipelineHealthFocus[];
  valueAtRisk: PipelineValueSplit;
  generatedAt: string;
} {
  const topLead = metrics.stalledLeads[0];
  const baseSummary = topLead
    ? `${topLead.leadName} is the clearest priority right now. ${topLead.reasons[0]}`
    : "Your pipeline has a few weak spots, but nothing is critical right now.";

  return {
    summary: baseSummary,
    focuses: buildFallbackFocuses(metrics.stalledLeads),
    valueAtRisk: metrics.valueAtRisk,
    generatedAt: metrics.generatedAt,
  };
}
