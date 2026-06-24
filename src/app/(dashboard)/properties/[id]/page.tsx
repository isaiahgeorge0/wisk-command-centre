import { redirect } from "next/navigation";

import {
  getCertificateAlertsByProperty,
  getCertificatesByProperty,
  getDocumentsByProperty,
  getFinancialSummary,
  getInsuranceByProperty,
  getMaintenanceByProperty,
  getMortgagesByProperty,
  getProperty,
  getRentPaymentsByProperty,
  getTenantsByProperty,
} from "@/app/(dashboard)/properties/actions";
import {
  PropertyDetailClient,
  type PropertyDetailTab,
} from "@/components/properties/property-detail-client";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const VALID_TABS = new Set<PropertyDetailTab>([
  "overview",
  "tenants",
  "maintenance",
  "finances",
  "messages",
  "documents",
  "certificates",
]);

export default async function PropertyDetailPage({
  params,
  searchParams,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { userId } = await getScopedSupabase();

  const [property, tenants, maintenanceTickets, rentPayments, certificates, documents, certificateAlerts, mortgages, insurance, monthlyFinancialSummary, annualFinancialSummary] =
    await Promise.all([
      getProperty(id),
      getTenantsByProperty(id),
      getMaintenanceByProperty(id),
      getRentPaymentsByProperty(id),
      getCertificatesByProperty(id),
      getDocumentsByProperty(id),
      getCertificateAlertsByProperty(id),
      getMortgagesByProperty(id),
      getInsuranceByProperty(id),
      getFinancialSummary(id, "monthly"),
      getFinancialSummary(id, "annual"),
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
      mortgages={mortgages}
      insurance={insurance}
      monthlyFinancialSummary={monthlyFinancialSummary}
      annualFinancialSummary={annualFinancialSummary}
      landlordUserId={userId}
      initialTab={initialTab}
    />
  );
}
