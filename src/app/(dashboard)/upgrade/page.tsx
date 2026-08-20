import { Suspense } from "react";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { getUserBillingSummary } from "@/lib/billing/plan";
import { UpgradePageClient } from "@/components/billing/upgrade-page-client";

export default async function UpgradePage() {
  const { supabase, userId } = await getScopedSupabase();
  const [
    billing,
    hasProperties,
    hasPropertiesPro,
    hasResearch,
    hasResearchPro,
  ] = await Promise.all([
    getUserBillingSummary(userId),
    hasPackageAccess(userId, "properties", supabase),
    hasPackageAccess(userId, "properties_pro", supabase),
    hasPackageAccess(userId, "research", supabase),
    hasPackageAccess(userId, "research_pro", supabase),
  ]);

  return (
    <Suspense>
      <UpgradePageClient
        plan={billing.plan}
        planLabel={billing.planLabel}
        currentPeriodEnd={billing.currentPeriodEnd}
        hasPropertiesSubscription={hasProperties}
        hasPropertiesProSubscription={hasPropertiesPro}
        hasResearchSubscription={hasResearch || hasResearchPro}
        hasResearchProSubscription={hasResearchPro}
      />
    </Suspense>
  );
}
