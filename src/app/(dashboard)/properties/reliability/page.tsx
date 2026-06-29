import {
  getAllRentPayments,
  getAllTenants,
} from "@/app/(dashboard)/properties/actions";
import { ReliabilityPageClient } from "@/components/properties/reliability-page-client";
import { ReliabilityTeaser } from "@/components/properties/reliability-teaser";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function ReliabilityPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProPlan = await hasPackageAccess(userId, "properties_pro", supabase);

  if (!hasProPlan) {
    return <ReliabilityTeaser />;
  }

  const [tenants, payments] = await Promise.all([
    getAllTenants(),
    getAllRentPayments(),
  ]);

  return <ReliabilityPageClient tenants={tenants} payments={payments} />;
}
