import { Suspense } from "react";

import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { getIntegrations } from "@/app/(dashboard)/settings/integrations/actions";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function SettingsPage() {
  const [profile, preferences, integrations] = await Promise.all([
    getUserProfile(),
    getOrCreateUserPreferences(),
    getIntegrations(),
  ]);

  const displayName =
    profile.name?.trim() ||
    profile.email.split("@")[0] ||
    "User";

  return (
    <Suspense fallback={null}>
      <SettingsPageShell
        email={profile.email}
        displayName={displayName}
        fieldVisibility={preferences.fieldVisibility}
        serviceTypes={preferences.serviceTypes}
        integrations={integrations}
      />
    </Suspense>
  );
}
