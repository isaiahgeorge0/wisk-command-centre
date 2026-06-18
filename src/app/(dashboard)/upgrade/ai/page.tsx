import { redirect } from "next/navigation";

import { AICheckoutClient } from "@/components/billing/ai-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserActiveSubscriptions } from "@/lib/billing/plan";

export default async function UpgradeAIPage() {
  const { userId } = await getScopedSupabase();
  const subscriptions = await getUserActiveSubscriptions(userId);

  if (subscriptions.length > 0) {
    redirect("/upgrade");
  }

  return (
    <AICheckoutClient priceId={process.env.STRIPE_PRICE_AI_MONTHLY ?? ""} />
  );
}
