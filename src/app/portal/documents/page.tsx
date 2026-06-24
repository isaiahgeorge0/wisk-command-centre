import { getPortalSharedDocuments } from "@/app/portal/actions";
import { PortalDocuments } from "@/components/portal/portal-documents";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";

export default async function PortalDocumentsPage() {
  await requireTenantContext();
  const documents = await getPortalSharedDocuments();

  return <PortalDocuments documents={documents} />;
}
