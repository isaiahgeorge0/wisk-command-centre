import { redirect } from "next/navigation";

import { getProperty } from "@/app/(dashboard)/properties/actions";
import { PropertyDetailClient } from "@/components/properties/property-detail-client";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    redirect("/properties/list");
  }

  return <PropertyDetailClient property={property} />;
}
