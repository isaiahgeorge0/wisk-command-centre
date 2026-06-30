import {
  getAllRentPayments,
  getAllTenants,
} from "@/app/(dashboard)/properties/actions";
import { NoticesPageClient } from "@/components/properties/notices-page-client";
import { NoticesTeaser } from "@/components/properties/notices-teaser";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import type { LandlordContact } from "@/lib/users/landlord-contact";

export default async function NoticesPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProPlan = await hasPackageAccess(userId, "properties_pro", supabase);

  if (!hasProPlan) {
    return <NoticesTeaser />;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("name, address_line1, address_line2, city, postcode, phone")
    .eq("id", userId)
    .single();

  const landlordContact: LandlordContact = {
    addressLine1: userRow?.address_line1 ?? null,
    addressLine2: userRow?.address_line2 ?? null,
    city: userRow?.city ?? null,
    postcode: userRow?.postcode ?? null,
    phone: userRow?.phone ?? null,
  };

  const [tenants, payments] = await Promise.all([
    getAllTenants(),
    getAllRentPayments(),
  ]);

  return (
    <NoticesPageClient
      tenants={tenants}
      payments={payments}
      landlordName={userRow?.name ?? ""}
      landlordContact={landlordContact}
    />
  );
}
