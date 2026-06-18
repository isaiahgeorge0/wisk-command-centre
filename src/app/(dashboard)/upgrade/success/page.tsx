import { UpgradeSuccessClient } from "@/components/billing/upgrade-success-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserBillingSummary } from "@/lib/billing/plan";

export default async function UpgradeSuccessPage() {
  const { userId } = await getScopedSupabase();
  // Webhook may not have fired yet — degrade gracefully if subscription absent
  const billing = await getUserBillingSummary(userId);

  return (
    <UpgradeSuccessClient plan={billing.plan} planLabel={billing.planLabel} />
  );
}
