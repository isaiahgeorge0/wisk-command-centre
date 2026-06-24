import { requireTenantContext } from "@/lib/portal/get-tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTenantMessages,
} from "@/app/portal/actions";
import { PortalMessagesClient } from "@/components/portal/portal-messages-client";

export default async function PortalMessagesPage() {
  const { tenant, property } = await requireTenantContext();
  const messages = await getTenantMessages();

  const admin = createAdminClient();
  const { data: landlordUser } = await admin
    .from("users")
    .select("name")
    .eq("id", tenant.user_id)
    .maybeSingle();
  const { data: prefs } = await admin
    .from("user_preferences")
    .select("display_name")
    .eq("user_id", tenant.user_id)
    .maybeSingle();

  const landlordName =
    prefs?.display_name?.trim() ||
    landlordUser?.name?.trim() ||
    "Your landlord";

  if (!tenant.portal_user_id) {
    return null;
  }

  return (
    <PortalMessagesClient
      initialMessages={messages}
      tenantId={tenant.id}
      senderId={tenant.portal_user_id}
      landlordName={landlordName}
      propertyName={property.name}
      propertyId={property.id}
      landlordUserId={tenant.user_id}
    />
  );
}
