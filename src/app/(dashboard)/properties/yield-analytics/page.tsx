import { redirect } from "next/navigation";

import { getProperties } from "@/app/(dashboard)/properties/actions";
import { YieldAnalyticsClient } from "@/components/properties/yield-analytics-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import {
  buildFinancialSummary,
  buildPortfolioFinancialOverview,
  fetchPropertyFinanceData,
} from "@/lib/properties/financial-summary";

export default async function YieldAnalyticsPage() {
  const { supabase, userId } = await getScopedSupabase();
  const hasProPlan = await hasPackageAccess(userId, "properties_pro", supabase);

  if (!hasProPlan) {
    redirect("/properties/finances");
  }

  const properties = await getProperties();

  const summaries = await Promise.all(
    properties.map(async (property) => {
      const data = await fetchPropertyFinanceData(property.id, userId, supabase);
      const annual = buildFinancialSummary(
        property,
        data.payments,
        data.mortgages,
        data.insurance,
        data.tickets,
        "annual"
      );
      return { property, annual };
    })
  );

  const portfolioOverview = buildPortfolioFinancialOverview(summaries);

  return (
    <YieldAnalyticsClient
      properties={properties}
      summaries={summaries}
      portfolioOverview={portfolioOverview}
    />
  );
}
