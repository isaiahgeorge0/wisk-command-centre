import { PortalShell } from "@/components/portal/portal-shell";
import { getTenantContext } from "@/lib/portal/get-tenant-context";
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

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();

  if (!context) {
    return <div className="min-h-dvh bg-background">{children}</div>;
  }

  const landlordName = await getLandlordDisplayName(context.tenant.user_id);

  return (
    <PortalShell
      tenant={context.tenant}
      property={context.property}
      landlordName={landlordName}
    >
      {children}
    </PortalShell>
  );
}
