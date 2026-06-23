import {
  getAllRentPayments,
  getAllTenants,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { FinancesPageClient } from "@/components/properties/finances-page-client";

export default async function PropertiesFinancesPage() {
  const [properties, payments, tenants] = await Promise.all([
    getProperties(),
    getAllRentPayments(),
    getAllTenants(),
  ]);

  return (
    <FinancesPageClient
      properties={properties}
      payments={payments}
      tenants={tenants}
    />
  );
}
