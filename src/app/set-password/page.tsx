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

export default async function SetPasswordPage() {
  const { user } = await getAuthContext();
  await getOrCreateUserPreferences();

  const email = user.email ?? "";
  const prefillName = await getPrefilledName(email);

  return (
    <SetPasswordClient
      email={email}
      defaultName={prefillName}
    />
  );
}
