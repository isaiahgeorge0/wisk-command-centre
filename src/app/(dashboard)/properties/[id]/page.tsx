import { redirect } from "next/navigation";

import {
  getCertificateAlertsByProperty,
  getCertificatesByProperty,
  getDocumentsByProperty,
  getMaintenanceByProperty,
  getProperty,
  getRentPaymentsByProperty,
  getTenantsByProperty,
} from "@/app/(dashboard)/properties/actions";
import {
  PropertyDetailClient,
  type PropertyDetailTab,
} from "@/components/properties/property-detail-client";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const VALID_TABS = new Set<PropertyDetailTab>([
  "overview",
  "tenants",
  "maintenance",
  "finances",
  "documents",
  "certificates",
]);

export default async function PropertyDetailPage({
  params,
  searchParams,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [property, tenants, maintenanceTickets, rentPayments, certificates, documents, certificateAlerts] =
    await Promise.all([
      getProperty(id),
      getTenantsByProperty(id),
      getMaintenanceByProperty(id),
      getRentPaymentsByProperty(id),
      getCertificatesByProperty(id),
      getDocumentsByProperty(id),
      getCertificateAlertsByProperty(id),
    ]);

  if (!property) {
    redirect("/properties/list");
  }

  const initialTab =
    tab && VALID_TABS.has(tab as PropertyDetailTab)
      ? (tab as PropertyDetailTab)
      : "overview";

  return (
    <PropertyDetailClient
      property={property}
      tenants={tenants}
      maintenanceTickets={maintenanceTickets}
      rentPayments={rentPayments}
      certificates={certificates}
      documents={documents}
      certificateAlerts={certificateAlerts}
      initialTab={initialTab}
    />
  );
}
