import { EmailPageClient } from "@/components/email/email-page-client";
import { EmailTeaserPage } from "@/components/email/email-teaser-page";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import type { EmailProvider } from "@/lib/email/types";

export default async function EmailPage() {
  const { supabase, userId } = await getScopedSupabase();

  const hasAiPro = await hasPackageAccess(userId, "ai_pro", supabase);

  if (!hasAiPro) {
    return <EmailTeaserPage />;
  }

  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("provider")
    .eq("user_id", userId)
    .in("provider", ["gmail", "outlook"]);

  const connectedProviders = (integrations ?? [])
    .map((row) => row.provider)
    .filter(
      (provider): provider is EmailProvider =>
        provider === "gmail" || provider === "outlook"
    );

  return <EmailPageClient connectedProviders={connectedProviders} />;
}
