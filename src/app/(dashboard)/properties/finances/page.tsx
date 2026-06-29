import {
  getAllInsurance,
  getAllMortgages,
  getAllRentPayments,
  getAllTenants,
  getPortfolioFinancialOverview,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { FinancesPageClient } from "@/components/properties/finances-page-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export default async function PropertiesFinancesPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [
    properties,
    payments,
    tenants,
    mortgages,
    insurance,
    portfolioOverview,
    hasProPlan,
  ] = await Promise.all([
    getProperties(),
    getAllRentPayments(),
    getAllTenants(),
    getAllMortgages(),
    getAllInsurance(),
    getPortfolioFinancialOverview(),
    hasPackageAccess(userId, "properties_pro", supabase),
  ]);

  return (
    <FinancesPageClient
      properties={properties}
      payments={payments}
      tenants={tenants}
      mortgages={mortgages}
      insurance={insurance}
      portfolioOverview={portfolioOverview}
      hasProPlan={hasProPlan}
    />
  );
}
