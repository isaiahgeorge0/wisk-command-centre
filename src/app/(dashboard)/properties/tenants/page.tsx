import { getAllTenants } from "@/app/(dashboard)/properties/actions";
import { TenantsPageClient } from "@/components/properties/tenants-page-client";

export default async function PropertiesTenantsPage() {
  const tenants = await getAllTenants();
  return <TenantsPageClient tenants={tenants} />;
}
