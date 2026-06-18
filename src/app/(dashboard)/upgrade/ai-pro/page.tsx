import { redirect } from "next/navigation";

import { AIProCheckoutClient } from "@/components/billing/ai-pro-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserActiveSubscriptions } from "@/lib/billing/plan";

export default async function UpgradeAIProPage() {
  const { userId } = await getScopedSupabase();
  const subscriptions = await getUserActiveSubscriptions(userId);

  if (subscriptions.length > 0) {
    redirect("/upgrade");
  }

  return (
    <AIProCheckoutClient priceId={process.env.STRIPE_PRICE_AI_PRO_MONTHLY ?? ""} />
  );
}
