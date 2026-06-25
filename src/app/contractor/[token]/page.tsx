import { notFound } from "next/navigation";

import {
  getJobSheetByToken,
  getTenantContactForJobSheet,
} from "@/app/contractor/actions";
import { ContractorPortalClient } from "@/components/contractor/contractor-portal-client";

type ContractorPortalPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ContractorPortalPage({
  params,
}: ContractorPortalPageProps) {
  const { token } = await params;
  const [jobSheet, tenantContact] = await Promise.all([
    getJobSheetByToken(token),
    getTenantContactForJobSheet(token),
  ]);

  if (!jobSheet) notFound();

  return (
    <ContractorPortalClient
      jobSheet={jobSheet}
      tenantContact={tenantContact}
      token={token}
    />
  );
}
