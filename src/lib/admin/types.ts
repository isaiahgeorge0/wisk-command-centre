import type { WiskPackage } from "@/lib/billing/types";

export type AccessRequestStatus = "pending" | "approved" | "declined";

export type AccessRequestFilter = "all" | AccessRequestStatus;

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  status: AccessRequestStatus;
  created_at: string;
  notes: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type AdminStats = {
  totalRequests: number;
  pendingRequests: number;
  totalUsers: number;
  requestsThisWeek: number;
  recentRequests: AccessRequest[];
  recentUsers: AdminUser[];
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  dismissal_count: number;
};

export type ActiveAnnouncement = {
  id: string;
  title: string;
  message: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type AdminActionResult<T = void> = ActionResult<T>;

export type SubscriptionRevenueRow = {
  package: WiskPackage;
  activeSubscribers: number;
  // Price derived from Stripe (`prices.retrieve`) — monthly unit amount.
  priceGBP: number | null;
  mrrContributionGBP: number | null;
};

export type SubscriptionRevenueTrend = {
  monthLabel: string;
  newThisMonth: number;
  churnedThisMonth: number;
};

export type SubscriptionRevenueBreakdown = {
  rows: SubscriptionRevenueRow[];
  totalActiveSubscribers: number;
  // Sum of `mrrContributionGBP` for packages where Stripe pricing is available.
  totalMRRKnownGBP: number;
  unknownPricePackages: WiskPackage[];
  trend?: SubscriptionRevenueTrend;
};

// ---------------------------------------------------------------------------
// AI Usage dashboard types
// ---------------------------------------------------------------------------

export type UsageFeature =
  | "chat"
  | "digest"
  | "email_draft"
  | "property_insights"
  | "email_picks_draft"
  | "pipeline_health"
  | "portal_triage"
  | "property_valuation"
  | "morning_briefing"
  | "lead_research_brief"
  | "research_competitor_check"
  | "research_place_lookup"
  | "research_open_chat"
  | "lead_auto_enrichment"
  | "research_document_analysis";

export type AIUsageByFeature = {
  feature: UsageFeature;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  rowCount: number;
};

export type AIUsageByModel = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
};

export type AIUsageTopUser = {
  userId: string;
  email: string | null;
  totalTokens: number;
  estimatedCostUSD: number;
};

export type AIUsageByProvider = {
  provider: "anthropic" | "tavily" | "exa" | "google_places";
  estimatedCostUSD: number;
  rowCount: number;
};

export type AIUsageBreakdown = {
  dateFrom: string;
  dateTo: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUSD: number;
  byFeature: AIUsageByFeature[];
  byModel: AIUsageByModel[];
  byProvider: AIUsageByProvider[];
  topUsers: AIUsageTopUser[];
};

// ---------------------------------------------------------------------------
// Winston engagement (simple admin trend)
// ---------------------------------------------------------------------------

export type WinstonEngagementScope = "note" | "section" | "general";

export type WinstonEngagementPoint = {
  /** ISO date string (YYYY-MM-DD) for the UTC week bucket start. */
  bucketStart: string;
  noteCount: number;
  sectionCount: number;
  generalCount: number;
  totalCount: number;
};

export type WinstonEngagementTrend = {
  dateFrom: string;
  dateTo: string;
  /** Users considered active based on `user_preferences.last_active_at`. */
  activeUserCount: number;
  totalConversations: number;
  /** conversations per active user, or null when there are 0 active users. */
  conversationsPerActiveUser: number | null;
  points: WinstonEngagementPoint[];
};

// ---------------------------------------------------------------------------
// Properties admin overview types
// ---------------------------------------------------------------------------

export type PropertiesPackageSplit = "properties" | "properties_pro";

export type PropertiesOverviewRow = {
  package: PropertiesPackageSplit;
  propertiesCount: number;
  overdueCertificatesCount: number;
  openMaintenanceTicketsCount: number;
  missingRentDataCount: number;
};

export type PropertiesOverview = {
  totalProperties: number;
  rows: PropertiesOverviewRow[];
};

// ---------------------------------------------------------------------------
// User detail (per-user admin rollup)
// ---------------------------------------------------------------------------

export type UserDetailSubscription = {
  package: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
};

export type UserDetailAIUsage = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUSD: number;
  byFeature: AIUsageByFeature[];
};

export type UserDetailProperties = {
  propertyCount: number;
  overdueCertificatesCount: number;
  openMaintenanceTicketsCount: number;
  missingRentDataCount: number;
};

export type UserDetailWinston = {
  totalConversations: number;
  noteCount: number;
  sectionCount: number;
  generalCount: number;
};

export type UserDetailIntegration = {
  provider: string;
  accountEmail: string | null;
  flag: string;
  connectedAt: string;
  lastSyncedAt: string | null;
};

export type UserDetail = {
  userId: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  subscriptions: UserDetailSubscription[];
  aiUsage: UserDetailAIUsage;
  properties: UserDetailProperties | null;
  winston: UserDetailWinston;
  integrations: UserDetailIntegration[];
};
