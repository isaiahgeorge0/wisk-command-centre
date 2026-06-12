import { WinstonChatClient } from "@/components/ai-digest/winston-chat-client";
import { WinstonTeaserPage } from "@/components/ai-digest/winston-teaser-page";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";

export default async function WinstonChatPage() {
  const { supabase, userId } = await getScopedSupabase();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("ai_access")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs?.ai_access !== true) {
    return <WinstonTeaserPage />;
  }

  return <WinstonChatClient />;
}
