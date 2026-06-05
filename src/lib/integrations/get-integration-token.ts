import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { decryptIntegrationToken } from "@/lib/integrations/crypto";
import type { IntegrationProvider } from "@/lib/integrations/types";

export async function getIntegrationAccessToken(
  provider: IntegrationProvider
): Promise<string | null> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("user_integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data?.access_token) {
    return null;
  }

  try {
    return decryptIntegrationToken(data.access_token);
  } catch (error) {
    console.error(`getIntegrationAccessToken(${provider}):`, error);
    return null;
  }
}

export async function getImportedVercelProjectIds(
  userId: string
): Promise<Set<string>> {
  const { supabase } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("projects")
    .select("vercel_project_id")
    .eq("user_id", userId)
    .not("vercel_project_id", "is", null);

  if (error) {
    console.error("getImportedVercelProjectIds:", error);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.vercel_project_id)
      .filter((id): id is string => Boolean(id))
  );
}
