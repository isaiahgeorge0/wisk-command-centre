import { redirect } from "next/navigation";

import { ResearchProCheckoutClient } from "@/components/billing/research-pro-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function UpgradeResearchProPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasResearchPro = await hasPackageAccess(
    userId,
    "research_pro",
    supabase
  );

  if (hasResearchPro) {
    redirect("/research");
  }

  return (
    <ResearchProCheckoutClient
      priceId={process.env.STRIPE_PRICE_RESEARCH_PRO_MONTHLY ?? ""}
    />
  );
}
