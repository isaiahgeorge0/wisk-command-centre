import { PortalShell } from "@/components/portal/portal-shell";
import { PortalThemeProvider } from "@/components/portal/portal-theme-provider";
import { getPortalUnreadCount } from "@/app/portal/actions";
import { getTenantContext } from "@/lib/portal/get-tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PortalTheme } from "@/lib/portal/types";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getTenantContext();

  if (!context) {
    return (
      <PortalThemeProvider persistTheme={false} initialTheme="light">
        {children}
      </PortalThemeProvider>
    );
  }

  const portalTheme = (context.tenant.portal_theme ?? "light") as PortalTheme;

  const admin = createAdminClient();
  const [{ data: landlordUser }, { data: prefs }, unreadMessageCount] =
    await Promise.all([
      admin
        .from("users")
        .select("name")
        .eq("id", context.tenant.user_id)
        .maybeSingle(),
      admin
        .from("user_preferences")
        .select("display_name")
        .eq("user_id", context.tenant.user_id)
        .maybeSingle(),
      getPortalUnreadCount(),
    ]);

  const landlordName =
    prefs?.display_name?.trim() ||
    landlordUser?.name?.trim() ||
    "Your landlord";

  return (
    <PortalThemeProvider initialTheme={portalTheme}>
      <PortalShell
        tenant={context.tenant}
        property={context.property}
        landlordName={landlordName}
        unreadMessageCount={unreadMessageCount}
      >
        {children}
      </PortalShell>
    </PortalThemeProvider>
  );
}
