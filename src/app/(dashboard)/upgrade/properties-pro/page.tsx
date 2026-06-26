import { redirect } from "next/navigation";

import { PropertiesProCheckoutClient } from "@/components/billing/properties-pro-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function UpgradePropertiesProPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasPropertiesPro = await hasPackageAccess(
    userId,
    "properties_pro",
    supabase
  );

  if (hasPropertiesPro) {
    redirect("/properties");
  }

  return (
    <PropertiesProCheckoutClient
      priceId={process.env.STRIPE_PRICE_PROPERTIES_PRO_MONTHLY ?? ""}
    />
  );
}
