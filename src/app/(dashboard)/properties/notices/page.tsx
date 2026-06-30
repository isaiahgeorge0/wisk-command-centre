import {
  getAllRentPayments,
  getAllTenants,
} from "@/app/(dashboard)/properties/actions";
import { NoticesPageClient } from "@/components/properties/notices-page-client";
import { NoticesTeaser } from "@/components/properties/notices-teaser";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function NoticesPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProPlan = await hasPackageAccess(userId, "properties_pro", supabase);

  if (!hasProPlan) {
    return <NoticesTeaser />;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .single();

  const [tenants, payments] = await Promise.all([
    getAllTenants(),
    getAllRentPayments(),
  ]);

  return (
    <NoticesPageClient
      tenants={tenants}
      payments={payments}
      landlordName={userRow?.name ?? ""}
    />
  );
}
