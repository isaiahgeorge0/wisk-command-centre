import { redirect } from "next/navigation";

import { PropertiesCheckoutClient } from "@/components/billing/properties-checkout-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function UpgradePropertiesPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProperties = await hasPackageAccess(userId, "properties", supabase);

  if (hasProperties) {
    redirect("/properties");
  }

  return (
    <PropertiesCheckoutClient
      priceId={process.env.STRIPE_PRICE_PROPERTIES_MONTHLY ?? ""}
    />
  );
}
