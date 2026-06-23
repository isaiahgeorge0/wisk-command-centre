import {
  getLatestPropertyInsight,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesDashboardClient } from "@/components/properties/properties-dashboard-client";

export default async function PropertiesDashboardPage() {
  const [properties, latestInsight] = await Promise.all([
    getProperties(),
    getLatestPropertyInsight(),
  ]);

  return (
    <PropertiesDashboardClient
      properties={properties}
      latestInsight={latestInsight}
    />
  );
}
