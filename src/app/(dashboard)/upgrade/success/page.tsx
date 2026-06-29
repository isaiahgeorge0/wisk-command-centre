import { UpgradeSuccessClient } from "@/components/billing/upgrade-success-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getStripePriceMap } from "@/lib/billing/constants";
import { getPackageDisplayName } from "@/lib/billing/emails";
import type { WiskPackage } from "@/lib/billing/types";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type UpgradeSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function UpgradeSuccessPage({
  searchParams,
}: UpgradeSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
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

  let pkg = (data?.package as WiskPackage | undefined) ?? null;

  if (!pkg && sessionId) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });
      const priceId = session.line_items?.data[0]?.price?.id;

      if (priceId) {
        const mapped = getStripePriceMap()[priceId];
        if (mapped) {
          pkg = mapped;
        }
      }
    } catch {
      // Fall through to generic success state if Stripe lookup fails
    }
  }

  const planLabel = pkg ? getPackageDisplayName(pkg) : "WISK";

  return <UpgradeSuccessClient pkg={pkg} planLabel={planLabel} />;
}
