import { Suspense } from "react";

import { getPortalMaintenanceTickets } from "@/app/portal/actions";
import { PortalMaintenance } from "@/components/portal/portal-maintenance";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";

export default async function PortalMaintenancePage() {
  await requireTenantContext();
  const tickets = await getPortalMaintenanceTickets();

  return (
    <Suspense fallback={null}>
      <PortalMaintenance tickets={tickets} />
    </Suspense>
  );
}
