import {
  getLatestPropertyInsight,
  getAllRentPayments,
  getProperties,
  getRentDueFlags,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesDashboardClient } from "@/components/properties/properties-dashboard-client";
import { buildPortfolioStats } from "@/lib/properties/selectors";

export default async function PropertiesDashboardPage() {
  const [properties, latestInsight, rentDueFlags, payments] = await Promise.all([
    getProperties(),
    getLatestPropertyInsight(),
    getRentDueFlags(),
    getAllRentPayments(),
  ]);

  const stats = buildPortfolioStats(properties, payments);

  return (
    <PropertiesDashboardClient
      properties={properties}
      latestInsight={latestInsight}
      rentDueFlags={rentDueFlags}
      rentDueThisMonth={stats.rentDueThisMonth}
    />
  );
}
