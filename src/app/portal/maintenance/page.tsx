import { Suspense } from "react";

import { getContractorAccessRequests, getPortalMaintenanceTickets } from "@/app/portal/actions";
import { PortalMaintenance } from "@/components/portal/portal-maintenance";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";

export default async function PortalMaintenancePage() {
  await requireTenantContext();
  const [tickets, accessRequests] = await Promise.all([
    getPortalMaintenanceTickets(),
    getContractorAccessRequests(),
  ]);

  return (
    <Suspense fallback={null}>
      <PortalMaintenance tickets={tickets} accessRequests={accessRequests} />
    </Suspense>
  );
}
