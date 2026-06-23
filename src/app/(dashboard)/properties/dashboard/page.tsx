import { getProperties } from "@/app/(dashboard)/properties/actions";
import { PropertiesDashboardClient } from "@/components/properties/properties-dashboard-client";

export default async function PropertiesDashboardPage() {
  const properties = await getProperties();

  return <PropertiesDashboardClient properties={properties} />;
}
