import {
  getAllRentPayments,
  getAllTenants,
} from "@/app/(dashboard)/properties/actions";
import { TenantsPageClient } from "@/components/properties/tenants-page-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function PropertiesTenantsPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [tenants, payments, hasProPlan] = await Promise.all([
    getAllTenants(),
    getAllRentPayments(),
    hasPackageAccess(userId, "properties_pro", supabase),
  ]);

  return (
    <TenantsPageClient
      tenants={tenants}
      payments={payments}
      hasProPlan={hasProPlan}
    />
  );
}
