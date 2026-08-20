import { redirect } from "next/navigation";

import { ResearchCheckoutClient } from "@/components/billing/research-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess, hasResearchAccess } from "@/lib/billing/access";

export default async function UpgradeResearchPage() {
  const { supabase, userId } = await getScopedSupabase();
  const [hasResearch, hasResearchPro] = await Promise.all([
    hasResearchAccess(userId, supabase),
    hasPackageAccess(userId, "research_pro", supabase),
  ]);

  if (hasResearchPro || hasResearch) {
    redirect("/research");
  }

  return (
    <ResearchCheckoutClient
      priceId={process.env.STRIPE_PRICE_RESEARCH_MONTHLY ?? ""}
    />
  );
}
