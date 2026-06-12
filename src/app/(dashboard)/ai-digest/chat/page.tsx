import { WinstonChatClient } from "@/components/ai-digest/winston-chat-client";
import { WinstonTeaserPage } from "@/components/ai-digest/winston-teaser-page";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ConversationMessage } from "@/lib/ai/types";

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

  // Fetch messages server-side so they're available on first render
  // without a client-side loading state or server action on mount.
  const { data: messages } = await supabase
    .from("ai_conversation_messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    <WinstonChatClient
      initialMessages={(messages ?? []) as ConversationMessage[]}
    />
  );
}
