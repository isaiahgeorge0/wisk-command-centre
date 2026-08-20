"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  AccessRequest,
  AccessRequestFilter,
  ActionResult,
  ActiveAnnouncement,
  AdminActionResult,
  AdminStats,
  AdminUser,
  AIUsageBreakdown,
  AIUsageByFeature,
  AIUsageByModel,
  AIUsageTopUser,
  Announcement,
  PropertiesPackageSplit,
  PropertiesOverview,
  PropertiesOverviewRow,
  SubscriptionRevenueBreakdown,
  UserDetail,
  UserDetailAIUsage,
  UserDetailIntegration,
  UserDetailProperties,
  UserDetailSubscription,
  UserDetailWinston,
  SubscriptionRevenueRow,
  SubscriptionRevenueTrend,
  WinstonEngagementTrend,
  UsageFeature,
} from "@/lib/admin/types";
import type {
  AdminFeedback,
  FeedbackFilter,
  FeedbackStats,
  FeedbackStatus,
} from "@/lib/feedback/types";
import type { ChangelogEntry, ChangelogType } from "@/lib/changelog/types";
import {
  SECTION_BAR_COLORS,
  SECTION_LABELS,
  type AdminUserHealth,
  type PlatformMetrics,
  type SectionKey,
  type UserActivityStatus,
  type UserHealthSummary,
} from "@/lib/admin/platform";
import { getStripeClient } from "@/lib/stripe/client";
import { sendApprovalNotification } from "@/lib/email/resend";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authEmailRedirectUrl } from "@/lib/auth/safe-redirect-origin";
import { siteUrl } from "@/lib/url";
import { STRIPE_PRICE_MAP } from "@/lib/billing/constants";
import type { WiskPackage } from "@/lib/billing/types";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";

const uuidParamSchema = z.string().uuid();

const approveRequestSchema = z.object({
  id: uuidParamSchema,
  email: z.string().email(),
  name: z.string().trim().min(1),
  welcomeMessage: z.string().optional(),
});

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  expiresAt: z.string().optional().nullable(),
});

const createChangelogEntrySchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  type: z.enum(["feature", "improvement", "fix"]),
  publishedAt: z.string().optional(),
});

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

const ALL_PACKAGES: WiskPackage[] = [
  "ai",
  "ai_pro",
  "research",
  "research_pro",
  "properties",
  "properties_pro",
  "social",
  "commerce",
  "max",
];

function startOfWeekUtc(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday
    )
  );
  return monday.toISOString();
}

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/users");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/ai-usage");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/changelog");
  revalidatePath("/");
}

function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function getPackagePriceMapGBP(): Promise<Record<WiskPackage, number | null>> {
  const prices: Record<WiskPackage, number | null> = {
    ai: null,
    ai_pro: null,
    research: null,
    research_pro: null,
    properties: null,
    properties_pro: null,
    social: null,
    commerce: null,
    max: null,
  };

  const stripePriceIdsByPackage = Object.entries(STRIPE_PRICE_MAP).reduce<
    Partial<Record<WiskPackage, string>>
  >((acc, [priceId, pkg]) => {
    // Ignore placeholder keys when real Stripe env vars are absent.
    if (priceId.includes("_placeholder")) {
      return acc;
    }
    acc[pkg] = priceId;
    return acc;
  }, {});

  const packagesWithStripePrices = Object.entries(stripePriceIdsByPackage) as Array<
    [WiskPackage, string]
  >;

  if (packagesWithStripePrices.length === 0) {
    return prices;
  }

  const stripe = getStripeClient();
  const stripeResults = await Promise.all(
    packagesWithStripePrices.map(async ([pkg, priceId]) => {
      const price = await stripe.prices.retrieve(priceId);
      const unitAmount = price.unit_amount;
      return {
        pkg,
        amountGBP:
          typeof unitAmount === "number" ? Number((unitAmount / 100).toFixed(2)) : null,
      };
    })
  );

  for (const result of stripeResults) {
    prices[result.pkg] = result.amountGBP;
  }

  return prices;
}

type SubscriptionAggregateRow = {
  package: WiskPackage;
  status: string;
  created_at: string;
  updated_at: string;
};

function buildSubscriptionTrend(
  rows: SubscriptionAggregateRow[]
): SubscriptionRevenueTrend | undefined {
  if (rows.length === 0) return undefined;

  const monthStart = startOfMonthUtc();
  const nextMonthStart = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
  );

  const newThisMonth = rows.filter((row) => {
    const createdAt = new Date(row.created_at);
    return createdAt >= monthStart && createdAt < nextMonthStart;
  }).length;

  const churnedThisMonth = rows.filter((row) => {
    if (row.status !== "cancelled") return false;
    const updatedAt = new Date(row.updated_at);
    return updatedAt >= monthStart && updatedAt < nextMonthStart;
  }).length;

  return {
    monthLabel: formatMonthLabel(monthStart),
    newThisMonth,
    churnedThisMonth,
  };
}

export async function getSubscriptionRevenueBreakdown(): Promise<SubscriptionRevenueBreakdown> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("package, status, created_at, updated_at")
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES, "cancelled"]);

  if (error) {
    console.error("getSubscriptionRevenueBreakdown:", error);
    return {
      rows: ALL_PACKAGES.map((pkg) => ({
        package: pkg,
        activeSubscribers: 0,
        priceGBP: null,
        mrrContributionGBP: null,
      })),
      totalActiveSubscribers: 0,
      totalMRRKnownGBP: 0,
      unknownPricePackages: [...ALL_PACKAGES],
    };
  }

  const rows = (data ?? []) as SubscriptionAggregateRow[];
  const activeRows = rows.filter((row) =>
    ACTIVE_SUBSCRIPTION_STATUSES.includes(
      row.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]
    )
  );

  const prices = await getPackagePriceMapGBP();

  const breakdownRows: SubscriptionRevenueRow[] = ALL_PACKAGES.map((pkg) => {
    const activeSubscribers = activeRows.filter((row) => row.package === pkg).length;
    const priceGBP = prices[pkg];
    return {
      package: pkg,
      activeSubscribers,
      priceGBP,
      mrrContributionGBP:
        priceGBP == null ? null : Number((activeSubscribers * priceGBP).toFixed(2)),
    };
  });

  const totalActiveSubscribers = breakdownRows.reduce(
    (sum, row) => sum + row.activeSubscribers,
    0
  );

  const totalMRRKnownGBP = Number(
    breakdownRows
      .reduce((sum, row) => sum + (row.mrrContributionGBP ?? 0), 0)
      .toFixed(2)
  );

  const unknownPricePackages = breakdownRows
    .filter((row) => row.activeSubscribers > 0 && row.priceGBP == null)
    .map((row) => row.package);

  return {
    rows: breakdownRows,
    totalActiveSubscribers,
    totalMRRKnownGBP,
    unknownPricePackages,
    trend: buildSubscriptionTrend(rows),
  };
}

export async function refreshSubscriptionRevenueBreakdown(): Promise<
  AdminActionResult<SubscriptionRevenueBreakdown>
> {
  try {
    const data = await getSubscriptionRevenueBreakdown();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not load the subscription revenue breakdown."
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// AI Usage dashboard
// ---------------------------------------------------------------------------

const aiUsageDateRangeSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const winstonEngagementDateRangeSchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine(
    (d) => new Date(`${d.dateFrom}T00:00:00.000Z`) <= new Date(`${d.dateTo}T23:59:59.999Z`),
    { message: "dateFrom must be <= dateTo" }
  )
  .refine((d) => {
    const from = new Date(`${d.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${d.dateTo}T23:59:59.999Z`);
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 180;
  }, { message: "Date range too large (max 180 days)" });

/**
 * Feature → inferred model mapping. The DB has no `model` column, but the
 * model is deterministic per feature **except** for `chat` and
 * `morning_briefing`, which use Haiku for free-tier users and Sonnet for paid.
 * We use Sonnet (higher cost) for those mixed features as a conservative upper
 * bound — actual cost may be lower.
 *
 * Model slug used in code:
 * - Sonnet: "claude-sonnet-4-6" → Anthropic pricing: $3 input / $15 output per MTok
 * - Haiku:  "claude-haiku-4-5-20251001" → Anthropic pricing: $1 input / $5 output per MTok
 *
 * Pricing source: https://platform.claude.com/docs/en/about-claude/pricing
 * Last verified: 2026-08-19
 */
const FEATURE_MODEL_MAP: Partial<Record<UsageFeature, "sonnet" | "haiku">> = {
  chat: "sonnet", // mixed, conservative upper bound
  digest: "sonnet",
  email_draft: "haiku",
  property_insights: "sonnet",
  email_picks_draft: "haiku",
  pipeline_health: "sonnet",
  portal_triage: "haiku",
  property_valuation: "sonnet",
  morning_briefing: "sonnet", // mixed, conservative upper bound
  lead_research_brief: "sonnet",
  research_open_chat: "sonnet",
  lead_auto_enrichment: "sonnet",
  research_document_analysis: "sonnet",
};

const MODEL_PRICING_USD_PER_TOKEN: Record<
  "sonnet" | "haiku",
  { input: number; output: number }
> = {
  sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  haiku: { input: 1 / 1_000_000, output: 5 / 1_000_000 },
};

function estimateCostUSD(
  feature: UsageFeature,
  inputTokens: number,
  outputTokens: number,
  provider: string,
  externalCostUSD = 0
): number {
  if (provider !== "anthropic") {
    return externalCostUSD;
  }
  const model = FEATURE_MODEL_MAP[feature] ?? "sonnet";
  const pricing = MODEL_PRICING_USD_PER_TOKEN[model];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

type UsageRow = {
  user_id: string;
  feature: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  external_cost_usd: number | null;
};

export async function getAIUsageBreakdown(
  dateFrom: string,
  dateTo: string
): Promise<AIUsageBreakdown> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("user_id, feature, provider, input_tokens, output_tokens, external_cost_usd")
    .gte("created_at", `${dateFrom}T00:00:00Z`)
    .lt("created_at", `${dateTo}T23:59:59.999Z`);

  if (error) {
    console.error("getAIUsageBreakdown:", error);
    return {
      dateFrom,
      dateTo,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCostUSD: 0,
      byFeature: [],
      byModel: [],
      byProvider: [],
      topUsers: [],
    };
  }

  const rows = (data ?? []) as UsageRow[];

  // --- By feature ---
  const featureMap = new Map<
    UsageFeature,
    { input: number; output: number; count: number; cost: number }
  >();
  for (const row of rows) {
    const f = row.feature as UsageFeature;
    const existing = featureMap.get(f) ?? {
      input: 0,
      output: 0,
      count: 0,
      cost: 0,
    };
    existing.input += row.input_tokens;
    existing.output += row.output_tokens;
    existing.count += 1;
    existing.cost += estimateCostUSD(
      f,
      row.input_tokens,
      row.output_tokens,
      row.provider,
      row.external_cost_usd ?? 0
    );
    featureMap.set(f, existing);
  }
  const byFeature: AIUsageByFeature[] = Array.from(featureMap.entries()).map(
    ([feature, agg]) => ({
      feature,
      inputTokens: agg.input,
      outputTokens: agg.output,
      estimatedCostUSD: agg.cost,
      rowCount: agg.count,
    })
  );
  byFeature.sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);

  // --- By model ---
  const modelMap = new Map<string, { input: number; output: number }>();
  for (const row of rows) {
    const model = FEATURE_MODEL_MAP[row.feature as UsageFeature];
    if (!model) continue;
    const existing = modelMap.get(model) ?? { input: 0, output: 0 };
    existing.input += row.input_tokens;
    existing.output += row.output_tokens;
    modelMap.set(model, existing);
  }
  const byModel: AIUsageByModel[] = Array.from(modelMap.entries()).map(
    ([model, agg]) => {
      const pricing = MODEL_PRICING_USD_PER_TOKEN[model as "sonnet" | "haiku"];
      return {
        model: model === "sonnet" ? "Claude Sonnet 4.6" : "Claude Haiku 4.5",
        inputTokens: agg.input,
        outputTokens: agg.output,
        estimatedCostUSD:
          agg.input * pricing.input + agg.output * pricing.output,
      };
    }
  );
  byModel.sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);

  // --- By provider ---
  const providerMap = new Map<
    "anthropic" | "tavily" | "exa" | "google_places",
    { cost: number; count: number }
  >();
  for (const row of rows) {
    const provider = row.provider as "anthropic" | "tavily" | "exa" | "google_places";
    const existing = providerMap.get(provider) ?? { cost: 0, count: 0 };
    existing.cost += estimateCostUSD(
      row.feature as UsageFeature,
      row.input_tokens,
      row.output_tokens,
      provider,
      row.external_cost_usd ?? 0
    );
    existing.count += 1;
    providerMap.set(provider, existing);
  }
  const byProvider = Array.from(providerMap.entries())
    .map(([provider, agg]) => ({
      provider,
      estimatedCostUSD: agg.cost,
      rowCount: agg.count,
    }))
    .sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);

  // --- Top users ---
  const userMap = new Map<string, { tokens: number; cost: number }>();
  for (const row of rows) {
    const existing = userMap.get(row.user_id) ?? { tokens: 0, cost: 0 };
    existing.tokens += row.input_tokens + row.output_tokens;
    existing.cost += estimateCostUSD(
      row.feature as UsageFeature,
      row.input_tokens,
      row.output_tokens,
      row.provider,
      row.external_cost_usd ?? 0
    );
    userMap.set(row.user_id, existing);
  }
  const sortedUsers = Array.from(userMap.entries())
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 20);

  // Resolve emails
  const emailMap = new Map<string, string | null>();
  if (sortedUsers.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in(
        "id",
        sortedUsers.map(([id]) => id)
      );
    if (users) {
      for (const u of users) {
        emailMap.set(u.id, u.email ?? null);
      }
    }
  }

  const topUsers: AIUsageTopUser[] = sortedUsers.map(([userId, agg]) => ({
    userId,
    email: emailMap.get(userId) ?? null,
    totalTokens: agg.tokens,
    estimatedCostUSD: agg.cost,
  }));

  const totalInputTokens = rows.reduce((s, r) => s + r.input_tokens, 0);
  const totalOutputTokens = rows.reduce((s, r) => s + r.output_tokens, 0);
  const totalEstimatedCostUSD = byFeature.reduce(
    (s, f) => s + f.estimatedCostUSD,
    0
  );

  return {
    dateFrom,
    dateTo,
    totalInputTokens,
    totalOutputTokens,
    totalEstimatedCostUSD: Number(totalEstimatedCostUSD.toFixed(4)),
    byFeature,
    byModel,
    byProvider,
    topUsers,
  };
}

export async function refreshAIUsageBreakdown(
  dateFrom: string,
  dateTo: string
): Promise<AdminActionResult<AIUsageBreakdown>> {
  try {
    const parsed = aiUsageDateRangeSchema.parse({ dateFrom, dateTo });
    const data = await getAIUsageBreakdown(parsed.dateFrom, parsed.dateTo);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not load the AI usage breakdown."
      ),
    };
  }
}

function startOfWeekUtcForDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  return d;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getWinstonEngagementTrendRaw(
  dateFrom: string,
  dateTo: string
): Promise<WinstonEngagementTrend> {
  await requireAdmin();
  const supabase = createAdminClient();

  // Conversations in range
  const { data: convoRows, error: convoError } = await supabase
    .from("ai_conversations")
    .select("created_at,user_id,note_id,scope_key")
    .gte("created_at", `${dateFrom}T00:00:00Z`)
    .lt("created_at", `${dateTo}T23:59:59.999Z`);

  if (convoError) {
    console.error("getWinstonEngagementTrendRaw: convoError", convoError);
    throw convoError;
  }

  const conversations = (convoRows ?? []) as Array<{
    created_at: string;
    user_id: string;
    note_id: string | null;
    scope_key: string | null;
  }>;

  const startBucket = startOfWeekUtcForDate(
    new Date(`${dateFrom}T00:00:00Z`)
  );
  const endBucket = startOfWeekUtcForDate(
    new Date(`${dateTo}T23:59:59.999Z`)
  );

  const bucketMap = new Map<
    string,
    {
      bucketStart: string;
      noteCount: number;
      sectionCount: number;
      generalCount: number;
      totalCount: number;
    }
  >();

  for (
    let cursor = new Date(startBucket);
    cursor.getTime() <= endBucket.getTime();
    cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000)
  ) {
    const key = isoDate(cursor);
    bucketMap.set(key, {
      bucketStart: key,
      noteCount: 0,
      sectionCount: 0,
      generalCount: 0,
      totalCount: 0,
    });
  }

  for (const row of conversations) {
    const bucketKey = isoDate(
      startOfWeekUtcForDate(new Date(row.created_at))
    );
    const bucket = bucketMap.get(bucketKey);
    if (!bucket) continue;

    if (row.note_id) bucket.noteCount += 1;
    else if (row.scope_key) bucket.sectionCount += 1;
    else bucket.generalCount += 1;

    bucket.totalCount += 1;
  }

  // Active users in range (based on last_active_at)
  const { data: activeRows, error: activeError } = await supabase
    .from("user_preferences")
    .select("user_id,last_active_at")
    .gte("last_active_at", `${dateFrom}T00:00:00Z`)
    .lt("last_active_at", `${dateTo}T23:59:59.999Z`);

  if (activeError) {
    console.error("getWinstonEngagementTrendRaw: activeError", activeError);
    throw activeError;
  }

  let activeUserCount = (activeRows ?? []).length;
  if (activeUserCount === 0) {
    // Fallback to avoid null/NaN when nobody loaded Overview in the window.
    activeUserCount = new Set(conversations.map((c) => c.user_id)).size;
  }

  const totalConversations = conversations.length;
  const conversationsPerActiveUser =
    activeUserCount > 0
      ? Number((totalConversations / activeUserCount).toFixed(2))
      : null;

  const points = Array.from(bucketMap.values()).sort((a, b) =>
    a.bucketStart.localeCompare(b.bucketStart)
  );

  return {
    dateFrom,
    dateTo,
    activeUserCount,
    totalConversations,
    conversationsPerActiveUser,
    points,
  };
}

export async function getWinstonEngagementTrend(
  dateFrom: string,
  dateTo: string
): Promise<WinstonEngagementTrend> {
  const parsed = winstonEngagementDateRangeSchema.parse({ dateFrom, dateTo });
  return getWinstonEngagementTrendRaw(parsed.dateFrom, parsed.dateTo);
}

export async function refreshWinstonEngagementTrend(
  dateFrom: string,
  dateTo: string
): Promise<AdminActionResult<WinstonEngagementTrend>> {
  try {
    const parsed = winstonEngagementDateRangeSchema.parse({ dateFrom, dateTo });
    const data = await getWinstonEngagementTrendRaw(parsed.dateFrom, parsed.dateTo);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not load the Winston engagement trend."
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Properties admin overview
// ---------------------------------------------------------------------------

type PropertiesUserSubscriptionRow = {
  user_id: string;
  package: PropertiesPackageSplit | string;
  status: string;
};

type PropertyRow = {
  id: string;
  user_id: string;
  monthly_rent: number | null;
};

type PropertyCertificateRow = {
  property_id: string;
  expiry_date: string | null;
};

type MaintenanceTicketRow = {
  property_id: string;
  status: string;
};

const PROPERTIES_PACKAGES: PropertiesPackageSplit[] = [
  "properties",
  "properties_pro",
];

const ZERO_PROPERTIES_OVERVIEW_ROWS: PropertiesOverviewRow[] = [
  {
    package: "properties",
    propertiesCount: 0,
    overdueCertificatesCount: 0,
    openMaintenanceTicketsCount: 0,
    missingRentDataCount: 0,
  },
  {
    package: "properties_pro",
    propertiesCount: 0,
    overdueCertificatesCount: 0,
    openMaintenanceTicketsCount: 0,
    missingRentDataCount: 0,
  },
];

export async function getPropertiesOverview(): Promise<PropertiesOverview> {
  await requireAdmin();
  const supabase = createAdminClient();

  // Split users into active `properties` vs `properties_pro`.
  const { data: subs, error: subsError } = await supabase
    .from("user_subscriptions")
    .select("user_id, package, status")
    .in("package", PROPERTIES_PACKAGES)
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES]);

  if (subsError || !subs?.length) {
    return {
      totalProperties: 0,
      rows: [...ZERO_PROPERTIES_OVERVIEW_ROWS],
    };
  }

  const proUserIds = new Set<string>();
  for (const sub of subs as PropertiesUserSubscriptionRow[]) {
    if (sub.package === "properties_pro") {
      proUserIds.add(sub.user_id);
    }
  }

  const baseUserIds = new Set<string>();
  for (const sub of subs as PropertiesUserSubscriptionRow[]) {
    if (sub.package === "properties" && !proUserIds.has(sub.user_id)) {
      baseUserIds.add(sub.user_id);
    }
  }

  const allUserIds = [...proUserIds, ...baseUserIds];
  if (allUserIds.length === 0) {
    return {
      totalProperties: 0,
      rows: [...ZERO_PROPERTIES_OVERVIEW_ROWS],
    };
  }

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, user_id, monthly_rent")
    .in("user_id", allUserIds);

  if (propertiesError) {
    return {
      totalProperties: 0,
      rows: [...ZERO_PROPERTIES_OVERVIEW_ROWS],
    };
  }

  const propertyIdToSplit = new Map<string, PropertiesPackageSplit>();
  let basePropertiesCount = 0;
  let proPropertiesCount = 0;
  let baseMissingRentCount = 0;
  let proMissingRentCount = 0;

  for (const p of (properties ?? []) as PropertyRow[]) {
    const split: PropertiesPackageSplit = proUserIds.has(p.user_id)
      ? "properties_pro"
      : "properties";
    propertyIdToSplit.set(p.id, split);

    if (split === "properties_pro") {
      proPropertiesCount += 1;
      if (p.monthly_rent == null) proMissingRentCount += 1;
    } else {
      basePropertiesCount += 1;
      if (p.monthly_rent == null) baseMissingRentCount += 1;
    }
  }

  const propertyIds = (properties ?? []).map((p) => p.id);

  // Overdue certificates: any certificate with `expiry_date < today`.
  const todayISO = new Date().toISOString().slice(0, 10);
  const overduePropertyIds = new Set<string>();
  let overdueBaseCount = 0;
  let overdueProCount = 0;

  if (propertyIds.length > 0) {
    const { data: certs } = await supabase
      .from("property_certificates")
      .select("property_id, expiry_date")
      .in("property_id", propertyIds);

    for (const cert of (certs ?? []) as PropertyCertificateRow[]) {
      if (cert.expiry_date && cert.expiry_date < todayISO) {
        overduePropertyIds.add(cert.property_id);
      }
    }

    for (const propertyId of overduePropertyIds) {
      const split = propertyIdToSplit.get(propertyId);
      if (split === "properties_pro") overdueProCount += 1;
      if (split === "properties") overdueBaseCount += 1;
    }
  }

  // Open maintenance tickets: `status in ('new', 'in_progress')`.
  const openMaintenancePropertyIds = new Set<string>();
  let openMaintenanceBaseCount = 0;
  let openMaintenanceProCount = 0;

  if (propertyIds.length > 0) {
    const { data: tickets } = await supabase
      .from("maintenance_tickets")
      .select("property_id, status")
      .in("property_id", propertyIds)
      .in("status", ["new", "in_progress"]);

    for (const t of (tickets ?? []) as MaintenanceTicketRow[]) {
      if (t.status === "new" || t.status === "in_progress") {
        openMaintenancePropertyIds.add(t.property_id);
      }
    }

    for (const propertyId of openMaintenancePropertyIds) {
      const split = propertyIdToSplit.get(propertyId);
      if (split === "properties_pro") openMaintenanceProCount += 1;
      if (split === "properties") openMaintenanceBaseCount += 1;
    }
  }

  const rows: PropertiesOverviewRow[] = [
    {
      package: "properties",
      propertiesCount: basePropertiesCount,
      overdueCertificatesCount: overdueBaseCount,
      openMaintenanceTicketsCount: openMaintenanceBaseCount,
      missingRentDataCount: baseMissingRentCount,
    },
    {
      package: "properties_pro",
      propertiesCount: proPropertiesCount,
      overdueCertificatesCount: overdueProCount,
      openMaintenanceTicketsCount: openMaintenanceProCount,
      missingRentDataCount: proMissingRentCount,
    },
  ];

  return {
    totalProperties: basePropertiesCount + proPropertiesCount,
    rows,
  };
}

export async function refreshPropertiesOverview(): Promise<
  AdminActionResult<PropertiesOverview>
> {
  try {
    const data = await getPropertiesOverview();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not load the properties overview."
      ),
    };
  }
}

function sortAccessRequests(requests: AccessRequest[]): AccessRequest[] {
  return [...requests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") {
      return -1;
    }
    if (b.status === "pending" && a.status !== "pending") {
      return 1;
    }
    if (a.status === "pending" && b.status === "pending") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function getAuthLastSignInMap(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("getAuthLastSignInMap:", error);
      break;
    }

    for (const user of data.users) {
      map.set(user.id, user.last_sign_in_at ?? null);
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return map;
}

function countByUserId(
  rows: { user_id: string }[] | null
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

function getActivityStatus(lastSignIn: string | null): UserActivityStatus {
  if (!lastSignIn) {
    return "dormant";
  }
  const days = Math.floor(
    (Date.now() - new Date(lastSignIn).getTime()) / 86_400_000
  );
  if (days <= 7) {
    return "active";
  }
  if (days <= 30) {
    return "inactive";
  }
  return "dormant";
}

export async function getAccessRequests(
  filter: AccessRequestFilter = "all"
): Promise<AccessRequest[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("access_requests")
    .select("id, name, email, status, created_at, notes")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAccessRequests:", error);
    return [];
  }

  return sortAccessRequests((data ?? []) as AccessRequest[]);
}

export async function updateAccessRequestNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid request id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("access_requests")
    .update({ notes: notes.trim() || null })
    .eq("id", idParsed.data);

  if (error) {
    console.error("updateAccessRequestNotes:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function approveRequest(
  id: string,
  email: string,
  name: string,
  welcomeMessage?: string
): Promise<ActionResult> {
  const parsed = approveRequestSchema.safeParse({
    id,
    email,
    name,
    welcomeMessage,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("access_requests")
    .update({ status: "approved" })
    .eq("id", parsed.data.id);

  if (updateError) {
    console.error("approveRequest update:", updateError);
    return { success: false, error: updateError.message };
  }

  try {
    await sendApprovalNotification({
      name: parsed.data.name,
      email: parsed.data.email,
    });
  } catch (error) {
    console.error("approveRequest approval notification:", error);
  }

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email.trim().toLowerCase(),
    {
      data: {
        name: parsed.data.name.trim(),
        welcome_message: parsed.data.welcomeMessage?.trim() || undefined,
      },
      redirectTo: authEmailRedirectUrl("/auth/callback"),
    }
  );

  if (inviteError) {
    const alreadyRegistered =
      inviteError.message.toLowerCase().includes("already") ||
      inviteError.message.toLowerCase().includes("registered");

    if (!alreadyRegistered) {
      console.error("approveRequest invite:", inviteError);
      return { success: false, error: inviteError.message };
    }
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function declineRequest(id: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid request id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("access_requests")
    .update({ status: "declined" })
    .eq("id", idParsed.data);

  if (error) {
    console.error("declineRequest:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUsers:", error);
    return [];
  }

  return (data ?? []) as AdminUser[];
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const supabase = createAdminClient();
  const weekStart = startOfWeekUtc();

  const [
    totalRequestsResult,
    pendingRequestsResult,
    totalUsersResult,
    requestsThisWeekResult,
    recentRequestsResult,
    recentUsersResult,
  ] = await Promise.all([
    supabase.from("access_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("access_requests")
      .select("id, name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("users")
      .select("id, email, name, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    totalRequests: totalRequestsResult.count ?? 0,
    pendingRequests: pendingRequestsResult.count ?? 0,
    totalUsers: totalUsersResult.count ?? 0,
    requestsThisWeek: requestsThisWeekResult.count ?? 0,
    recentRequests: (recentRequestsResult.data ?? []) as AccessRequest[],
    recentUsers: (recentUsersResult.data ?? []) as AdminUser[],
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      created_at,
      expires_at,
      created_by,
      announcement_dismissals ( count )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAnnouncements:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const dismissals = row.announcement_dismissals as
      | { count: number }[]
      | null;
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      created_at: row.created_at,
      expires_at: row.expires_at,
      created_by: row.created_by,
      dismissal_count: dismissals?.[0]?.count ?? 0,
    };
  });
}

export async function createAnnouncement(
  title: string,
  message: string,
  expiresAt?: string | null
): Promise<ActionResult> {
  const parsed = createAnnouncementSchema.safeParse({
    title,
    message,
    expiresAt,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const expiresValue = parsed.data.expiresAt?.trim();
  let parsedExpiresAt: string | null = null;
  if (expiresValue) {
    parsedExpiresAt = new Date(`${expiresValue}T23:59:59.999Z`).toISOString();
  }

  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    message: parsed.data.message,
    expires_at: parsedExpiresAt,
    created_by: admin.id,
  });

  if (error) {
    console.error("createAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid announcement id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    console.error("deleteAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getActiveAnnouncements(): Promise<ActiveAnnouncement[]> {
  const { supabase, userId } = await getScopedSupabase();
  const now = new Date().toISOString();

  const [{ data: announcements, error: announcementsError }, { data: dismissals, error: dismissalsError }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, message, created_at, expires_at")
        .lte("created_at", now)
        .order("created_at", { ascending: true }),
      supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", userId),
    ]);

  if (announcementsError) {
    console.error("getActiveAnnouncements:", announcementsError);
    return [];
  }

  if (dismissalsError) {
    console.error("getActiveAnnouncements dismissals:", dismissalsError);
    return [];
  }

  const dismissedIds = new Set(
    (dismissals ?? []).map((row) => row.announcement_id)
  );
  const nowMs = Date.now();

  return (announcements ?? [])
    .filter((row) => {
      if (dismissedIds.has(row.id)) {
        return false;
      }
      if (!row.expires_at) {
        return true;
      }
      return new Date(row.expires_at).getTime() > nowMs;
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
    }));
}

export async function dismissAnnouncement(
  announcementId: string
): Promise<ActionResult> {
  const { user } = await getAuthContext();
  const supabase = await createClient();

  const { error } = await supabase.from("announcement_dismissals").insert({
    user_id: user.id,
    announcement_id: announcementId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true };
    }
    console.error("dismissAnnouncement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getFeedback(
  filter: FeedbackFilter = "all"
): Promise<AdminFeedback[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("feedback")
    .select(
      `
      id,
      user_id,
      type,
      message,
      status,
      created_at,
      admin_notes,
      users ( name, email )
    `
    )
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getFeedback:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const userRaw = row.users as
      | { name: string | null; email: string }
      | { name: string | null; email: string }[]
      | null;
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      admin_notes: row.admin_notes,
      user_name: user?.name ?? null,
      user_email: user?.email ?? "",
    };
  }) as AdminFeedback[];
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("updateFeedbackStatus:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function updateFeedbackNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feedback")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("updateFeedbackNotes:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  if (error) {
    console.error("getFeedbackStats:", error);
    return { newCount: 0 };
  }

  return { newCount: count ?? 0 };
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  await requireAdmin();
  const supabase = createAdminClient();

  async function countExact(table: string, selectColumn: string): Promise<number> {
    const { count, error } = await supabase
      .from(table)
      .select(selectColumn, { count: "exact", head: true });
    if (error) {
      console.error(`getPlatformMetrics: countExact ${table}:`, error);
      return 0;
    }
    return count ?? 0;
  }

  const [
    projectsCount,
    tasksCount,
    goalsCount,
    ideasCount,
    leadsCount,
    contentPostsCount,

    propertiesCount,
    tenantsCount,
    maintenanceTicketsCount,
    rentPaymentsCount,
    propertyCertificatesCount,
    propertyDocumentsCount,
    propertyMortgagesCount,
    propertyInsuranceCount,
    propertyValuationsCount,
    propertyComparablesCount,
    propertyInsightsCount,
    tenantMessagesCount,
    contractorsCount,
    jobSheetsCount,
    jobSheetUpdatesCount,
    contractorAccessRequestsCount,
    certificateAlertLogCount,
    mortgageAlertLogCount,
    insuranceAlertLogCount,
    rentReminderLogCount,

    aiReportsCount,
    aiConversationsCount,
    aiConversationMessagesCount,
    aiContextCacheCount,
    aiUsageLogCount,
    winstonEmailPicksCount,
    morningBriefingsCount,
    awaySummariesCount,

    contentPostOccurrencesCount,
    calendarEventsCount,

    leadActivitiesCount,
    notificationsCount,
  ] = await Promise.all([
    countExact("projects", "id"),
    countExact("tasks", "id"),
    countExact("goals", "id"),
    countExact("ideas", "id"),
    countExact("leads", "id"),
    countExact("content_posts", "id"),

    // Properties package
    countExact("properties", "id"),
    countExact("tenants", "id"),
    countExact("maintenance_tickets", "id"),
    countExact("rent_payments", "id"),
    countExact("property_certificates", "id"),
    countExact("property_documents", "id"),
    countExact("property_mortgages", "id"),
    countExact("property_insurance", "id"),
    countExact("property_valuations", "id"),
    countExact("property_comparables", "id"),
    countExact("property_insights", "id"),
    countExact("tenant_messages", "id"),
    countExact("contractors", "id"),
    countExact("job_sheets", "id"),
    countExact("job_sheet_updates", "id"),
    countExact("contractor_access_requests", "id"),
    countExact("certificate_alert_log", "id"),
    countExact("mortgage_alert_log", "id"),
    countExact("insurance_alert_log", "id"),
    countExact("rent_reminder_log", "id"),

    // AI tables
    countExact("ai_reports", "id"),
    countExact("ai_conversations", "id"),
    countExact("ai_conversation_messages", "id"),
    // ai_context_cache is keyed by (user_id), not an `id` column.
    countExact("ai_context_cache", "user_id"),
    countExact("ai_usage_log", "id"),
    countExact("winston_email_picks", "id"),
    countExact("morning_briefings", "id"),
    countExact("away_summaries", "id"),

    // Content calendar tables
    countExact("content_post_occurrences", "id"),
    countExact("calendar_events", "id"),

    // Leads / pipeline tables
    countExact("lead_activities", "id"),
    countExact("notifications", "id"),
  ]);

  const counts: Record<SectionKey, number> = {
    projects: projectsCount,
    tasks: tasksCount,
    goals: goalsCount,
    ideas: ideasCount,
    leads: leadsCount,
    content: contentPostsCount,
  };

  const sectionActivity = (Object.keys(counts) as SectionKey[])
    .map((key) => ({
      key,
      label: SECTION_LABELS[key],
      count: counts[key],
      barClass: SECTION_BAR_COLORS[key],
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalProjects: counts.projects,
    totalTasks: counts.tasks,
    totalLeads: counts.leads,
    totalContentPosts: counts.content,
    sectionActivity,
    tableCounts: [
      // Original 6
      { table: "projects", count: projectsCount },
      { table: "tasks", count: tasksCount },
      { table: "goals", count: goalsCount },
      { table: "ideas", count: ideasCount },
      { table: "leads", count: leadsCount },
      { table: "content_posts", count: contentPostsCount },

      // Properties package
      { table: "properties", count: propertiesCount },
      { table: "tenants", count: tenantsCount },
      { table: "maintenance_tickets", count: maintenanceTicketsCount },
      { table: "rent_payments", count: rentPaymentsCount },
      { table: "property_certificates", count: propertyCertificatesCount },
      { table: "property_documents", count: propertyDocumentsCount },
      { table: "property_mortgages", count: propertyMortgagesCount },
      { table: "property_insurance", count: propertyInsuranceCount },
      { table: "property_valuations", count: propertyValuationsCount },
      { table: "property_comparables", count: propertyComparablesCount },
      { table: "property_insights", count: propertyInsightsCount },
      { table: "tenant_messages", count: tenantMessagesCount },
      { table: "contractors", count: contractorsCount },
      { table: "job_sheets", count: jobSheetsCount },
      { table: "job_sheet_updates", count: jobSheetUpdatesCount },
      {
        table: "contractor_access_requests",
        count: contractorAccessRequestsCount,
      },
      { table: "certificate_alert_log", count: certificateAlertLogCount },
      { table: "mortgage_alert_log", count: mortgageAlertLogCount },
      { table: "insurance_alert_log", count: insuranceAlertLogCount },
      { table: "rent_reminder_log", count: rentReminderLogCount },

      // AI tables
      { table: "ai_reports", count: aiReportsCount },
      { table: "ai_conversations", count: aiConversationsCount },
      {
        table: "ai_conversation_messages",
        count: aiConversationMessagesCount,
      },
      { table: "ai_context_cache", count: aiContextCacheCount },
      { table: "ai_usage_log", count: aiUsageLogCount },
      { table: "winston_email_picks", count: winstonEmailPicksCount },
      { table: "morning_briefings", count: morningBriefingsCount },
      { table: "away_summaries", count: awaySummariesCount },

      // Content calendar
      { table: "content_post_occurrences", count: contentPostOccurrencesCount },
      { table: "calendar_events", count: calendarEventsCount },

      // Leads / pipeline
      { table: "lead_activities", count: leadActivitiesCount },
      { table: "notifications", count: notificationsCount },
    ].sort((a, b) => b.count - a.count),
  };
}

export async function getUsersWithHealth(): Promise<AdminUserHealth[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [
    usersResult,
    projectsResult,
    tasksResult,
    authMap,
    prefsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, name, username, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("user_id"),
    supabase.from("tasks").select("user_id"),
    getAuthLastSignInMap(supabase),
    supabase.from("user_preferences").select("user_id, ai_access"),
    supabase
      .from("user_subscriptions")
      .select("user_id, package, status")
      .in("status", ["active", "trialing"]),
  ]);

  if (usersResult.error) {
    console.error("getUsersWithHealth:", usersResult.error);
    return [];
  }

  const projectCounts = countByUserId(projectsResult.data);
  const taskCounts = countByUserId(tasksResult.data);

  const aiAccessMap = new Map<string, boolean>();
  for (const row of prefsResult.data ?? []) {
    aiAccessMap.set(row.user_id, row.ai_access ?? false);
  }

  const subscriptionsMap = new Map<
    string,
    { package: string; status: string }[]
  >();
  for (const row of subscriptionsResult.data ?? []) {
    const existing = subscriptionsMap.get(row.user_id) ?? [];
    existing.push({ package: row.package, status: row.status });
    subscriptionsMap.set(row.user_id, existing);
  }

  const now = Date.now();

  return (usersResult.data ?? []).map((user) => {
    const lastSignIn = authMap.get(user.id) ?? null;
    const daysSinceJoined = Math.floor(
      (now - new Date(user.created_at).getTime()) / 86_400_000
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username ?? null,
      created_at: user.created_at,
      last_sign_in_at: lastSignIn,
      project_count: projectCounts.get(user.id) ?? 0,
      task_count: taskCounts.get(user.id) ?? 0,
      days_since_joined: daysSinceJoined,
      activity_status: getActivityStatus(lastSignIn),
      ai_access: aiAccessMap.get(user.id) ?? false,
      subscriptions: subscriptionsMap.get(user.id) ?? [],
    };
  });
}

export async function toggleAIAccess(userId: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid user id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  // Read current value first
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("ai_access")
    .eq("user_id", idParsed.data)
    .maybeSingle();

  const current = prefs?.ai_access ?? false;

  if (prefs === null) {
    // No preferences row yet — insert with the toggled value
    const { error } = await supabase
      .from("user_preferences")
      .insert({ user_id: idParsed.data, ai_access: !current });

    if (error) {
      console.error("toggleAIAccess insert:", error);
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("user_preferences")
      .update({ ai_access: !current, updated_at: new Date().toISOString() })
      .eq("user_id", idParsed.data);

    if (error) {
      console.error("toggleAIAccess update:", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function generateUserDigest(userId: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid user id." };
  }

  await requireAdmin();

  const secret = process.env.AI_DIGEST_SECRET;

  if (!secret) {
    return { success: false, error: "AI_DIGEST_SECRET is not configured" };
  }

  try {
    const res = await fetch(siteUrl("/api/ai-digest/generate-for-user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ userId: idParsed.data }),
      }
    );

    let json: { success?: boolean; error?: string };
    try {
      json = (await res.json()) as { success?: boolean; error?: string };
    } catch {
      return { success: false, error: "Invalid response from digest service" };
    }

    if (!res.ok || json.error) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generateUserDigest:", message);
    return { success: false, error: message };
  }
}

const DELETE_USER_ERROR = "Could not delete user. Please try again.";

function logDeleteUserFailure(step: string, error: unknown): ActionResult {
  console.error(`deleteUser ${step}:`, error);
  return { success: false, error: DELETE_USER_ERROR };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: DELETE_USER_ERROR };
  }

  await requireAdmin();

  const trimmedUserId = idParsed.data;

  const supabase = createAdminClient();

  const { data: authData, error: authLookupError } =
    await supabase.auth.admin.getUserById(trimmedUserId);

  if (authLookupError || !authData.user?.email) {
    return logDeleteUserFailure("auth lookup", authLookupError ?? "missing email");
  }

  const userEmail = authData.user.email.trim().toLowerCase();

  const steps: Array<{ step: string; error: { message: string } | null }> = [];

  steps.push({
    step: "ai_usage_log",
    error: (await supabase.from("ai_usage_log").delete().eq("user_id", trimmedUserId))
      .error,
  });
  steps.push({
    step: "ai_conversation_messages",
    error: (
      await supabase
        .from("ai_conversation_messages")
        .delete()
        .eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "ai_conversations",
    error: (
      await supabase.from("ai_conversations").delete().eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "ai_context_cache",
    error: (
      await supabase.from("ai_context_cache").delete().eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "ai_reports",
    error: (await supabase.from("ai_reports").delete().eq("user_id", trimmedUserId))
      .error,
  });
  steps.push({
    step: "lead_activities",
    error: (
      await supabase.from("lead_activities").delete().eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "notifications",
    error: (
      await supabase.from("notifications").delete().eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "announcement_dismissals",
    error: (
      await supabase
        .from("announcement_dismissals")
        .delete()
        .eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "feedback",
    error: (await supabase.from("feedback").delete().eq("user_id", trimmedUserId))
      .error,
  });
  steps.push({
    step: "access_requests",
    error: (
      await supabase.from("access_requests").delete().eq("email", userEmail)
    ).error,
  });
  steps.push({
    step: "user_connections",
    error: (
      await supabase
        .from("user_connections")
        .delete()
        .or(`requester_id.eq.${trimmedUserId},recipient_id.eq.${trimmedUserId}`)
    ).error,
  });
  steps.push({
    step: "item_shares",
    error: (
      await supabase
        .from("item_shares")
        .delete()
        .or(`owner_id.eq.${trimmedUserId},recipient_id.eq.${trimmedUserId}`)
    ).error,
  });
  steps.push({
    step: "user_subscriptions",
    error: (
      await supabase
        .from("user_subscriptions")
        .delete()
        .eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "user_integrations",
    error: (
      await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "user_preferences",
    error: (
      await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", trimmedUserId)
    ).error,
  });
  steps.push({
    step: "public.users",
    error: (await supabase.from("users").delete().eq("id", trimmedUserId)).error,
  });

  for (const { step, error } of steps) {
    if (error) {
      return logDeleteUserFailure(step, error);
    }
  }

  const { error: authDeleteError } =
    await supabase.auth.admin.deleteUser(trimmedUserId);

  if (authDeleteError) {
    return logDeleteUserFailure("auth.users", authDeleteError);
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getUserHealthSummary(): Promise<UserHealthSummary> {
  const users = await getUsersWithHealth();
  return users.reduce(
    (acc, user) => {
      acc[user.activity_status] += 1;
      return acc;
    },
    { active: 0, inactive: 0, dormant: 0 }
  );
}

export async function createUserManually(
  name: string,
  email: string
): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(1),
      email: z.string().email(),
    })
    .safeParse({ name, email });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email.trim().toLowerCase(),
    {
      data: { name: parsed.data.name.trim() },
      redirectTo: authEmailRedirectUrl("/auth/callback"),
    }
  );

  if (error) {
    console.error("createUserManually:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function resetUserOnboarding(userId: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid user id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", idParsed.data);

  if (error) {
    console.error("resetUserOnboarding:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  return { success: true };
}

export async function resetUserPersonalisation(
  userId: string
): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid user id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_preferences")
    .update({
      personalisation_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", idParsed.data);

  if (error) {
    console.error("resetUserPersonalisation:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/welcome");
  return { success: true };
}

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("changelog_entries")
    .select("id, title, description, type, published_at, created_by")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("getChangelogEntries:", error);
    return [];
  }

  return (data ?? []) as ChangelogEntry[];
}

export async function createChangelogEntry(input: {
  title: string;
  description: string;
  type: ChangelogType;
  publishedAt: string;
}): Promise<ActionResult> {
  const parsed = createChangelogEntrySchema.safeParse({
    title: input.title,
    description: input.description,
    type: input.type,
    publishedAt: input.publishedAt,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const publishedAt = parsed.data.publishedAt?.trim() ?? "";
  const parsedPublishedAt = publishedAt
    ? new Date(`${publishedAt}T12:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from("changelog_entries").insert({
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    published_at: parsedPublishedAt,
    created_by: admin.id,
  });

  if (error) {
    console.error("createChangelogEntry:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/");
  return { success: true };
}

export async function deleteChangelogEntry(id: string): Promise<ActionResult> {
  const idParsed = uuidParamSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Invalid changelog entry id." };
  }

  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("changelog_entries")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    console.error("deleteChangelogEntry:", error);
    return { success: false, error: error.message };
  }

  revalidateAdminPaths();
  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// User detail rollup
// ---------------------------------------------------------------------------

export async function getUserDetail(
  userId: string
): Promise<AdminActionResult<UserDetail>> {
  const idParsed = uuidParamSchema.safeParse(userId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid user ID." };
  }

  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const uid = idParsed.data;

    // ── Basic user info ───────────────────────────────────────────────────
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, email, name, created_at")
      .eq("id", uid)
      .single();

    if (userError || !userRow) {
      return {
        success: false,
        error: toSafeActionError(userError, "User not found."),
      };
    }

    // Last sign-in from auth
    let lastSignInAt: string | null = null;
    try {
      const { data: authData } =
        await supabase.auth.admin.getUserById(uid);
      lastSignInAt = authData?.user?.last_sign_in_at ?? null;
    } catch {
      // Non-critical
    }

    // ── Subscriptions ─────────────────────────────────────────────────────
    const { data: subRows } = await supabase
      .from("user_subscriptions")
      .select("package, status, created_at, updated_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const subscriptions: UserDetailSubscription[] = (subRows ?? []).map(
      (s) => ({
        package: s.package as string,
        status: s.status as string,
        createdAt: s.created_at as string,
        updatedAt: (s.updated_at as string) ?? null,
      })
    );

    // ── AI usage (all-time for this user) ─────────────────────────────────
    const { data: usageRows } = await supabase
      .from("ai_usage_log")
      .select("feature, provider, input_tokens, output_tokens, external_cost_usd")
      .eq("user_id", uid);

    const featureMap = new Map<
      UsageFeature,
      { input: number; output: number; count: number; cost: number }
    >();
    for (const row of (usageRows ?? []) as Array<{
      feature: string;
      provider: string;
      input_tokens: number;
      output_tokens: number;
      external_cost_usd: number | null;
    }>) {
      const f = row.feature as UsageFeature;
      const existing = featureMap.get(f) ?? {
        input: 0,
        output: 0,
        count: 0,
        cost: 0,
      };
      existing.input += row.input_tokens;
      existing.output += row.output_tokens;
      existing.count += 1;
      existing.cost += estimateCostUSD(
        f,
        row.input_tokens,
        row.output_tokens,
        row.provider,
        row.external_cost_usd ?? 0
      );
      featureMap.set(f, existing);
    }

    const byFeature: AIUsageByFeature[] = Array.from(
      featureMap.entries()
    ).map(([feature, agg]) => ({
      feature,
      inputTokens: agg.input,
      outputTokens: agg.output,
      estimatedCostUSD: agg.cost,
      rowCount: agg.count,
    }));
    byFeature.sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD);

    const aiUsage: UserDetailAIUsage = {
      totalInputTokens: byFeature.reduce((s, f) => s + f.inputTokens, 0),
      totalOutputTokens: byFeature.reduce((s, f) => s + f.outputTokens, 0),
      totalEstimatedCostUSD: Number(
        byFeature.reduce((s, f) => s + f.estimatedCostUSD, 0).toFixed(4)
      ),
      byFeature,
    };

    // ── Properties (only if user has a properties package) ────────────────
    const hasPropertiesPackage = subscriptions.some(
      (s) =>
        (s.package === "properties" || s.package === "properties_pro") &&
        ACTIVE_SUBSCRIPTION_STATUSES.includes(
          s.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]
        )
    );

    let properties: UserDetailProperties | null = null;
    if (hasPropertiesPackage) {
      const { data: props } = await supabase
        .from("properties")
        .select("id, monthly_rent")
        .eq("user_id", uid);

      const propertyRows = (props ?? []) as Array<{
        id: string;
        monthly_rent: number | null;
      }>;
      const propertyIds = propertyRows.map((p) => p.id);
      const missingRentDataCount = propertyRows.filter(
        (p) => p.monthly_rent == null
      ).length;

      let overdueCertificatesCount = 0;
      let openMaintenanceTicketsCount = 0;

      if (propertyIds.length > 0) {
        const todayISO = new Date().toISOString().slice(0, 10);

        const { data: certs } = await supabase
          .from("property_certificates")
          .select("property_id, expiry_date")
          .in("property_id", propertyIds);

        const overdueProps = new Set<string>();
        for (const cert of (certs ?? []) as Array<{
          property_id: string;
          expiry_date: string | null;
        }>) {
          if (cert.expiry_date && cert.expiry_date < todayISO) {
            overdueProps.add(cert.property_id);
          }
        }
        overdueCertificatesCount = overdueProps.size;

        const { data: tickets } = await supabase
          .from("maintenance_tickets")
          .select("property_id")
          .in("property_id", propertyIds)
          .in("status", ["new", "in_progress"]);

        const openProps = new Set<string>();
        for (const t of (tickets ?? []) as Array<{
          property_id: string;
        }>) {
          openProps.add(t.property_id);
        }
        openMaintenanceTicketsCount = openProps.size;
      }

      properties = {
        propertyCount: propertyRows.length,
        overdueCertificatesCount,
        openMaintenanceTicketsCount,
        missingRentDataCount,
      };
    }

    // ── Winston conversations ─────────────────────────────────────────────
    const { data: convoRows } = await supabase
      .from("ai_conversations")
      .select("note_id, scope_key")
      .eq("user_id", uid);

    const conversations = (convoRows ?? []) as Array<{
      note_id: string | null;
      scope_key: string | null;
    }>;

    const winston: UserDetailWinston = {
      totalConversations: conversations.length,
      noteCount: conversations.filter((c) => c.note_id).length,
      sectionCount: conversations.filter(
        (c) => !c.note_id && c.scope_key
      ).length,
      generalCount: conversations.filter(
        (c) => !c.note_id && !c.scope_key
      ).length,
    };

    // ── Integrations ──────────────────────────────────────────────────────
    const { data: integrationRows } = await supabase
      .from("user_integrations")
      .select(
        "provider, email_address, refresh_token, metadata, connected_at, last_synced_at"
      )
      .eq("user_id", uid);

    const nowMs = Date.now();
    const integrations: UserDetailIntegration[] = (
      integrationRows ?? []
    ).map((row) => {
      const r = row as {
        provider: string;
        email_address: string | null;
        refresh_token: string | null;
        metadata: Record<string, unknown> | null;
        connected_at: string;
        last_synced_at: string | null;
      };

      let flag = "ok";
      if (!r.refresh_token) {
        flag = "missing_refresh_token";
      } else {
        const expiresAt =
          typeof r.metadata?.expires_at === "number"
            ? r.metadata.expires_at
            : null;
        if (expiresAt === null) flag = "missing_expires_at";
        else if (expiresAt < nowMs) flag = "expired_token";
        else if (expiresAt - nowMs < 5 * 60 * 1000) flag = "expires_soon";
      }

      return {
        provider: r.provider,
        accountEmail: r.email_address,
        flag,
        connectedAt: r.connected_at,
        lastSyncedAt: r.last_synced_at,
      };
    });

    return {
      success: true,
      data: {
        userId: uid,
        email: userRow.email as string,
        name: (userRow.name as string) ?? null,
        createdAt: userRow.created_at as string,
        lastSignInAt,
        subscriptions,
        aiUsage,
        properties,
        winston,
        integrations,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(error, "Could not load user details."),
    };
  }
}
