import { PortalShell } from "@/components/portal/portal-shell";
import { PortalThemeProvider } from "@/components/portal/portal-theme-provider";
import { getTenantContext } from "@/lib/portal/get-tenant-context";
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

  return (
    <PortalThemeProvider initialTheme={portalTheme}>
      <PortalShell tenant={context.tenant} property={context.property}>
        {children}
      </PortalShell>
    </PortalThemeProvider>
  );
}
