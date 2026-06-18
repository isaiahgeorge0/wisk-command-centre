import { redirect } from "next/navigation";

import { PlanCheckoutClient } from "@/components/billing/plan-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getUserActiveSubscriptions } from "@/lib/billing/plan";

export default async function UpgradeAIProPage() {
  const { userId } = await getScopedSupabase();
  const subscriptions = await getUserActiveSubscriptions(userId);

  if (subscriptions.length > 0) {
    redirect("/upgrade");
  }

  return (
    <PlanCheckoutClient
      plan={{
        key: "ai_pro",
        name: "WISK AI Pro",
        price: 19,
        priceId: process.env.STRIPE_PRICE_AI_PRO_MONTHLY ?? "",
        features: [
          "Everything in WISK AI",
          "Email integration — Gmail and Outlook",
          "AI-organised inbox linked to your leads and clients",
          "Higher usage limits",
          "Priority support",
        ],
        dayOneUnlocks: [
          "Everything in WISK AI, activated immediately",
          "Connect Gmail or Outlook from Settings",
          "AI groups emails by Leads, Clients, and Admin",
          "Higher monthly token allowance",
        ],
      }}
      showUpsell={false}
    />
  );
}
