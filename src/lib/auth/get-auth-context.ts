import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { UnauthorizedError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  await ensureUserProfile(supabase, user);

  return { supabase, user };
}
