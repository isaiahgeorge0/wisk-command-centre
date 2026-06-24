import {
  getAllInsurance,
  getAllMortgages,
  getAllRentPayments,
  getAllTenants,
  getPortfolioFinancialOverview,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { FinancesPageClient } from "@/components/properties/finances-page-client";

export default async function PropertiesFinancesPage() {
  const [properties, payments, tenants, mortgages, insurance, portfolioOverview] =
    await Promise.all([
    getProperties(),
    getAllRentPayments(),
    getAllTenants(),
    getAllMortgages(),
    getAllInsurance(),
    getPortfolioFinancialOverview(),
  ]);

  return (
    <FinancesPageClient
      properties={properties}
      payments={payments}
      tenants={tenants}
      mortgages={mortgages}
      insurance={insurance}
      portfolioOverview={portfolioOverview}
    />
  );
}
