import { UpgradeSuccessClient } from "@/components/billing/upgrade-success-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getPackageDisplayName } from "@/lib/billing/emails";
import type { WiskPackage } from "@/lib/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UpgradeSuccessPage() {
  const { userId } = await getScopedSupabase();

  // Webhook may not have fired yet — use most recent active/trialing row when present
  const { data } = await createAdminClient()
    .from("user_subscriptions")
    .select("package")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pkg = (data?.package as WiskPackage | undefined) ?? null;
  const planLabel = pkg ? getPackageDisplayName(pkg) : "WISK";

  return <UpgradeSuccessClient pkg={pkg} planLabel={planLabel} />;
}
