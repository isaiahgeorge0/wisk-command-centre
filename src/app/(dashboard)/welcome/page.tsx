import { SetPasswordClient } from "@/components/set-password/set-password-client";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

async function getPrefilledName(email: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("access_requests")
      .select("name")
      .eq("email", email.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.name?.trim() ?? "";
  } catch {
    return "";
  }
}

export default async function WelcomePage() {
  const { user } = await getAuthContext();
  await getOrCreateUserPreferences();

  const email = user.email ?? "";
  const prefillName = await getPrefilledName(email);

  // Email+password signup sets user_metadata.password_set; magic-link /
  // invite users do not, so they still need to choose a password here.
  // (Both flows use the "email" identity provider, so identities alone
  // cannot distinguish them.)
  const hasPassword = user.user_metadata?.password_set === true;

  return (
    <SetPasswordClient
      email={email}
      defaultName={prefillName}
      hasPassword={hasPassword}
    />
  );
}
