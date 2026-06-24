import {
  getLatestPropertyInsight,
  getProperties,
  getRentDueFlags,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesDashboardClient } from "@/components/properties/properties-dashboard-client";

export default async function PropertiesDashboardPage() {
  const [properties, latestInsight, rentDueFlags] = await Promise.all([
    getProperties(),
    getLatestPropertyInsight(),
    getRentDueFlags(),
  ]);

  return (
    <PropertiesDashboardClient
      properties={properties}
      latestInsight={latestInsight}
      rentDueFlags={rentDueFlags}
    />
  );
}
