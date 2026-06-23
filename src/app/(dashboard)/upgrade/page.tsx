import { Suspense } from "react";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { getUserBillingSummary } from "@/lib/billing/plan";
import { UpgradePageClient } from "@/components/billing/upgrade-page-client";

export default async function UpgradePage() {
  const { supabase, userId } = await getScopedSupabase();
  const [billing, hasProperties] = await Promise.all([
    getUserBillingSummary(userId),
    hasPackageAccess(userId, "properties", supabase),
  ]);

  return (
    <Suspense>
      <UpgradePageClient
        plan={billing.plan}
        planLabel={billing.planLabel}
        currentPeriodEnd={billing.currentPeriodEnd}
        hasPropertiesSubscription={hasProperties}
      />
    </Suspense>
  );
}
