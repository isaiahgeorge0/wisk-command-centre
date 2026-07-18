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
  const { supabase, user } = await getAuthContext();
  await getOrCreateUserPreferences();

  const email = user.email ?? "";
  const timezone =
    (user.user_metadata?.timezone as string | undefined) ?? "Europe/London";
  await supabase
    .from("user_preferences")
    .update({ timezone })
    .eq("user_id", user.id);

  // Try user_metadata.full_name first (set during sign-up form)
  const metaName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
  const prefillName = metaName || (await getPrefilledName(email));

  // password_set is set by the sign-up form; full_name covers users who
  // signed up before that flag existed. Magic link / invite users have neither.
  const hasPassword =
    user.user_metadata?.password_set === true ||
    !!(user.user_metadata?.full_name as string | undefined)?.trim();

  return (
    <SetPasswordClient
      email={email}
      defaultName={prefillName}
      hasPassword={hasPassword}
    />
  );
}
