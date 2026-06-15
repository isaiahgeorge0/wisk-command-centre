import { getUserBillingSummary } from "@/lib/billing/plan";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { UpgradePageClient } from "@/components/billing/upgrade-page-client";

export default async function UpgradePage() {
  const { userId } = await getScopedSupabase();
  const billing = await getUserBillingSummary(userId);

  return (
    <UpgradePageClient
      plan={billing.plan}
      planLabel={billing.planLabel}
      currentPeriodEnd={billing.currentPeriodEnd}
    />
  );
}
