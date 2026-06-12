import { WinstonDigestPageClient } from "@/components/ai-digest/ai-digest-page-client";
import { WinstonTeaserPage } from "@/components/ai-digest/winston-teaser-page";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { DigestContent } from "@/lib/ai/digest-generator";

export default async function AiDigestPage() {
  const { supabase, userId } = await getScopedSupabase();

  // ── Access check ────────────────────────────────────────────────────────────
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("ai_access")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs?.ai_access !== true) {
    return <WinstonTeaserPage />;
  }

  // ── Fetch latest digest ─────────────────────────────────────────────────────
  const { data } = await supabase
    .from("ai_reports")
    .select("content, generated_at")
    .eq("user_id", userId)
    .eq("report_type", "weekly_digest")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let digest: DigestContent | null = null;

  if (data?.content) {
    try {
      digest = JSON.parse(data.content) as DigestContent;
    } catch {
      console.error("ai-digest page: failed to parse stored digest content");
    }
  }

  return <WinstonDigestPageClient digest={digest} />;
}
