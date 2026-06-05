"use client";

import { PageTransition } from "@/components/layout/page-transition";
import { AdminPanelLink } from "@/components/settings/admin-panel-link";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { PAGE_TITLE_CLASS, PAGE_SUBTITLE_CLASS } from "@/lib/navigation";
import type { SafeIntegration } from "@/lib/integrations/types";
import type { FieldVisibility } from "@/lib/preferences/types";

type SettingsPageShellProps = {
  email: string;
  displayName: string;
  accountName: string;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
  integrations: SafeIntegration[];
  showAdminLink?: boolean;
};

export function SettingsPageShell({
  showAdminLink = false,
  ...props
}: SettingsPageShellProps) {
  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className={PAGE_TITLE_CLASS}>Settings</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Profile, display preferences, project types, and integrations.
        </p>
      </div>
      <SettingsPageClient {...props} />
      {showAdminLink ? <AdminPanelLink /> : null}
    </PageTransition>
  );
}
