import { getProperties } from "@/app/(dashboard)/properties/actions";
import { SA105PageClient } from "@/components/properties/sa105-page-client";
import { SA105Teaser } from "@/components/properties/sa105-teaser";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { fetchPropertyFinanceData } from "@/lib/properties/financial-summary";
import type {
  MaintenanceTicket,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";

export default async function SA105Page() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProPlan = await hasPackageAccess(userId, "properties_pro", supabase);

  if (!hasProPlan) {
    return <SA105Teaser />;
  }

  const properties = await getProperties();

  const financeData = await Promise.all(
    properties.map((property) =>
      fetchPropertyFinanceData(property.id, userId, supabase)
    )
  );

  const allPayments: Record<string, RentPayment[]> = {};
  const allMortgages: Record<string, PropertyMortgage[]> = {};
  const allInsurance: Record<string, PropertyInsurance[]> = {};
  const allTickets: Record<string, MaintenanceTicket[]> = {};

  for (const data of financeData) {
    if (!data.property) continue;
    const propertyId = data.property.id;
    allPayments[propertyId] = data.payments;
    allMortgages[propertyId] = data.mortgages;
    allInsurance[propertyId] = data.insurance;
    allTickets[propertyId] = data.tickets;
  }

  return (
    <SA105PageClient
      properties={properties}
      allPayments={allPayments}
      allMortgages={allMortgages}
      allInsurance={allInsurance}
      allTickets={allTickets}
    />
  );
}
