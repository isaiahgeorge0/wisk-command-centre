import { redirect } from "next/navigation";

import { PortalHome } from "@/components/portal/portal-home";
import {
  getPortalMaintenanceTickets,
} from "@/app/portal/actions";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";

async function getLandlordDisplayName(landlordUserId: string): Promise<string | null> {
  const admin = createAdminClient();
  const [{ data: prefs }, { data: user }] = await Promise.all([
    admin
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", landlordUserId)
      .maybeSingle(),
    admin.from("users").select("name, email").eq("id", landlordUserId).maybeSingle(),
  ]);

  return (
    prefs?.display_name?.trim() ||
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    null
  );
}

export default async function PortalHomePage() {
  const context = await requireTenantContext();

  if (!context.tenant.portal_user_id) {
    redirect("/portal/login");
  }

  const [tickets, landlordName] = await Promise.all([
    getPortalMaintenanceTickets(),
    getLandlordDisplayName(context.tenant.user_id),
  ]);

  return (
    <PortalHome
      tenant={context.tenant}
      property={context.property}
      tickets={tickets}
      landlordName={landlordName}
    />
  );
}
