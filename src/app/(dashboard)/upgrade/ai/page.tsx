import { redirect } from "next/navigation";

import { PlanCheckoutClient } from "@/components/billing/plan-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserActiveSubscriptions } from "@/lib/billing/plan";

export default async function UpgradeAIPage() {
  const { userId } = await getScopedSupabase();
  const subscriptions = await getUserActiveSubscriptions(userId);

  if (subscriptions.length > 0) {
    redirect("/upgrade");
  }

  return (
    <PlanCheckoutClient
      plan={{
        key: "ai",
        name: "WISK AI",
        price: 9,
        priceId: process.env.STRIPE_PRICE_AI_MONTHLY ?? "",
        features: [
          "AI Digest — weekly business summary every Sunday",
          "WISK Chat — ask Winston anything about your business",
          "Smart suggestions across your entire workspace",
          "100,000 tokens per month",
        ],
        dayOneUnlocks: [
          "Winston Digest delivered every Sunday morning",
          "Unlimited WISK Chat conversations",
          "Smart suggestions on your Overview dashboard",
        ],
      }}
      showUpsell
    />
  );
}
