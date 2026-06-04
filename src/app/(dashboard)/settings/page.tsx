import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function SettingsPage() {
  const [profile, preferences] = await Promise.all([
    getUserProfile(),
    getOrCreateUserPreferences(),
  ]);

  const displayName =
    profile.name?.trim() ||
    profile.email.split("@")[0] ||
    "User";

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile, display preferences, and project service types.
        </p>
      </div>

      <SettingsPageClient
        email={profile.email}
        displayName={displayName}
        fieldVisibility={preferences.fieldVisibility}
        serviceTypes={preferences.serviceTypes}
      />
    </>
  );
}
