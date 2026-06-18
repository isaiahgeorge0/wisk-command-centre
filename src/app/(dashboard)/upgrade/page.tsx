import { Suspense } from "react";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserBillingSummary } from "@/lib/billing/plan";
import { UpgradePageClient } from "@/components/billing/upgrade-page-client";

export default async function UpgradePage() {
  const { userId } = await getScopedSupabase();
  const billing = await getUserBillingSummary(userId);

  return (
    <Suspense>
      <UpgradePageClient
        plan={billing.plan}
        planLabel={billing.planLabel}
        currentPeriodEnd={billing.currentPeriodEnd}
        priceAi={process.env.STRIPE_PRICE_AI_MONTHLY ?? ""}
        priceAiPro={process.env.STRIPE_PRICE_AI_PRO_MONTHLY ?? ""}
      />
    </Suspense>
  );
}
