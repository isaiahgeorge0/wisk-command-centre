import { WelcomePageClient } from "@/components/welcome/welcome-page-client";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function WelcomePage() {
  const { user } = await getAuthContext();
  const preferences = await getOrCreateUserPreferences();

  const defaultName =
    preferences.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <WelcomePageClient
      defaultName={defaultName}
      defaultTheme={preferences.themePreference}
    />
  );
}
