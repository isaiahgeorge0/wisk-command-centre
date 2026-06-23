import { getProperties } from "@/app/(dashboard)/properties/actions";
import { PropertiesListClient } from "@/components/properties/properties-list-client";

export default async function PropertiesListPage() {
  const properties = await getProperties();

  return <PropertiesListClient initialProperties={properties} />;
}
