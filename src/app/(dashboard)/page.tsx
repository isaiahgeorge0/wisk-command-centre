import { getContentPosts } from "@/app/(dashboard)/content/actions";
import { getIdeas } from "@/app/(dashboard)/ideas/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getLeads } from "@/app/(dashboard)/leads/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { updateLastActive } from "@/app/(dashboard)/actions/update-last-active";
import {
  getAllRentPayments,
  getExpiringCertificates,
  getMaintenanceTickets,
  getPendingAccessRequests,
  getProperties,
  getRentDueFlags,
  getTotalUnreadMessageCount,
  getUpcomingInsuranceRenewals,
  getUpcomingMortgagePayments,
} from "@/app/(dashboard)/properties/actions";
import { OverviewPageClient } from "@/components/overview/overview-page-client";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getAwaySummary } from "@/lib/away/away-store";
import { hasAIAccess, hasPackageAccess } from "@/lib/billing/access";
import { shouldShowUpgradeBanner } from "@/lib/billing/banner";
import { getUserBillingSummary } from "@/lib/billing/plan";
import { getTodaysBriefing } from "@/lib/morning/briefing-store";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import { buildPortfolioStats } from "@/lib/properties/selectors";
import { buildOverviewSnapshot } from "@/lib/overview/selectors";
import { buildSuggestions } from "@/lib/suggestions";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OverviewPage() {
  const { supabase, userId } = await getScopedSupabase();
  const admin = createAdminClient();

  const [
    projects,
    tasks,
    goals,
    ideas,
    leads,
    contentPosts,
    profile,
    preferences,
    prefsRow,
    billing,
    hasProperties,
    hasPropertiesPro,
    hasAiPro,
    awaySummaryResult,
    todaysBriefing,
    emailIntegrationsResult,
    userRow,
  ] = await Promise.all([
    getProjects(),
    getTasks(),
    getGoals(),
    getIdeas(),
    getLeads(),
    getContentPosts(),
    getUserProfile(),
    getOrCreateUserPreferences(),
    supabase
      .from("user_preferences")
      .select("ai_access, upgrade_banner_dismissed_at, last_active_at")
      .eq("user_id", userId)
      .maybeSingle(),
    getUserBillingSummary(userId),
    hasPackageAccess(userId, "properties", admin),
    hasPackageAccess(userId, "properties_pro", admin),
    hasPackageAccess(userId, "ai_pro", admin),
    getAwaySummary(userId),
    getTodaysBriefing(userId),
    supabase
      .from("user_integrations")
      .select("id, provider, label, email_address")
      .eq("user_id", userId)
      .in("provider", ["gmail", "outlook"])
      .limit(3),
    supabase.from("users").select("created_at").eq("id", userId).maybeSingle(),
  ]);

  const canAccessWinston = await hasAIAccess(
    userId,
    admin,
    prefsRow.data?.ai_access ?? false
  );
  const lastActiveAt = prefsRow.data?.last_active_at ?? null;

  void updateLastActive().catch(() => {});

  const showUpgradeBanner = shouldShowUpgradeBanner({
    plan: billing.plan,
    hasPropertiesSubscription: hasProperties,
    hasPropertiesProSubscription: hasPropertiesPro,
    userCreatedAt: userRow.data?.created_at ?? new Date().toISOString(),
    dismissedAt: prefsRow.data?.upgrade_banner_dismissed_at ?? null,
  });

  let portfolioStats = null;
  let rentDueFlags: Awaited<ReturnType<typeof getRentDueFlags>> = [];
  let openMaintenanceTickets: Awaited<
    ReturnType<typeof getMaintenanceTickets>
  > = [];
  let unreadMessageCount = 0;
  let expiringCertificates: Awaited<
    ReturnType<typeof getExpiringCertificates>
  > = [];
  let pendingAccessRequests: Awaited<
    ReturnType<typeof getPendingAccessRequests>
  > = [];
  let mortgages: Awaited<ReturnType<typeof getUpcomingMortgagePayments>> = [];
  let insurance: Awaited<ReturnType<typeof getUpcomingInsuranceRenewals>> = [];

  if (hasProperties) {
    const [
      properties,
      payments,
      flags,
      tickets,
      unread,
      certificates,
      accessRequests,
      mortgageRows,
      insuranceRows,
    ] =
      await Promise.all([
        getProperties(),
        getAllRentPayments(),
        getRentDueFlags(),
        getMaintenanceTickets(["new", "in_progress"]),
        getTotalUnreadMessageCount(),
        getExpiringCertificates(90),
        getPendingAccessRequests(),
        getUpcomingMortgagePayments(),
        getUpcomingInsuranceRenewals(),
      ]);

    portfolioStats = buildPortfolioStats(properties, payments);
    rentDueFlags = flags;
    openMaintenanceTickets = tickets;
    unreadMessageCount = unread;
    expiringCertificates = certificates;
    pendingAccessRequests = accessRequests;
    mortgages = mortgageRows;
    insurance = insuranceRows;
  }

  const suggestions = canAccessWinston
    ? await buildSuggestions(userId, supabase)
    : [];

  const displayName = resolveDisplayName({
    displayName: preferences.displayName,
    profileName: profile.name,
    email: profile.email,
  });

  const snapshot = buildOverviewSnapshot(
    projects,
    tasks,
    goals,
    ideas,
    leads,
    contentPosts,
    new Date(),
    displayName
  );

  return (
    <>
      {showUpgradeBanner ? <UpgradeBanner plan={billing.plan} /> : null}
      <OverviewPageClient
        snapshot={snapshot}
        suggestions={suggestions}
        canAccessWhileAway={hasAiPro}
        morningBriefing={todaysBriefing}
        awaySummary={awaySummaryResult.summary}
        lastSyncedAt={
          awaySummaryResult.lastSyncedAt?.toISOString() ?? null
        }
        lastActiveAt={lastActiveAt}
        projects={projects}
        goals={goals}
        ideas={ideas}
        leads={leads}
        hasProperties={hasProperties}
        portfolioStats={portfolioStats}
        rentDueFlags={rentDueFlags}
        openMaintenanceTickets={openMaintenanceTickets}
        unreadMessageCount={unreadMessageCount}
        expiringCertificates={expiringCertificates}
        pendingAccessRequests={pendingAccessRequests}
        mortgages={mortgages}
        insurance={insurance}
        emailIntegrations={(emailIntegrationsResult.data ?? []).map(
          (integration) => ({
            id: integration.id,
            provider: integration.provider,
            label: integration.label ?? integration.email_address ?? null,
          })
        )}
      />
    </>
  );
}
