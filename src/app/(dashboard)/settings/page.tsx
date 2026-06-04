import { SettingsPageShell } from "@/components/settings/settings-page-shell";
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
    <SettingsPageShell
      email={profile.email}
      displayName={displayName}
      fieldVisibility={preferences.fieldVisibility}
      serviceTypes={preferences.serviceTypes}
    />
  );
}
