import type { SupabaseClient } from "@supabase/supabase-js";

import type { WiskPackage } from "@/lib/billing/types";

// Max includes all packages
const MAX_INCLUDES: WiskPackage[] = [
  "ai",
  "ai_pro",
  "social",
  "commerce",
  "properties",
];

export type { WiskPackage };

export async function hasPackageAccess(
  userId: string,
  pkg: WiskPackage,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("package, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  if (!data?.length) return false;

  return data.some(
    (sub) =>
      sub.package === pkg ||
      (sub.package === "max" &&
        (pkg === "max" || MAX_INCLUDES.includes(pkg as WiskPackage)))
  );
}

export async function hasAIAccess(
  userId: string,
  supabase: SupabaseClient,
  aiAccessOverride?: boolean
): Promise<boolean> {
  if (aiAccessOverride === true) return true;

  const hasAi = await hasPackageAccess(userId, "ai", supabase);
  if (hasAi) return true;

  return hasPackageAccess(userId, "ai_pro", supabase);
}
