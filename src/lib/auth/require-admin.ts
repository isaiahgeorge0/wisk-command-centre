import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { isAdminEmail } from "@/lib/auth/is-admin";

export async function requireAdmin(): Promise<User> {
  const { user } = await getAuthContext();
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }
  return user;
}
