import {
  getActiveProjects,
  getConversations,
  getMonthlyUsage,
} from "@/app/(dashboard)/ai-digest/actions";
import { WinstonChatClient } from "@/components/ai-digest/winston-chat-client";
import { WinstonTeaserPage } from "@/components/ai-digest/winston-teaser-page";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { WINSTON_MONTHLY_TOKEN_LIMIT } from "@/lib/ai/constants";
import type { ConversationMessage } from "@/lib/ai/types";

export default async function WinstonChatPage() {
  const { supabase, userId } = await getScopedSupabase();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("ai_access")
    .eq("user_id", userId)
    .maybeSingle();

  const canAccessWinston = await hasAIAccess(
    userId,
    createAdminClient(),
    prefs?.ai_access ?? false
  );

  if (!canAccessWinston) {
    return <WinstonTeaserPage />;
  }

  const [conversationsResult, usageResult, projectsResult] = await Promise.all(
    [getConversations(), getMonthlyUsage(), getActiveProjects()]
  );

  const conversations =
    conversationsResult.success && conversationsResult.data
      ? conversationsResult.data
      : [];

  const usage =
    usageResult.success && usageResult.data
      ? usageResult.data
      : {
          chatTokens: 0,
          digestTokens: 0,
          total: 0,
          limit: WINSTON_MONTHLY_TOKEN_LIMIT,
          percentage: 0,
          resetDate: new Date().toISOString(),
        };

  const activeProjects =
    projectsResult.success && projectsResult.data ? projectsResult.data : [];

  // Load messages for the most recent conversation
  let initialMessages: ConversationMessage[] = [];
  let initialConversationId: string | null = null;

  if (conversations.length > 0) {
    const mostRecent = conversations[0];
    initialConversationId = mostRecent.id;

    const { data: msgs } = await supabase
      .from("ai_conversation_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .eq("conversation_id", mostRecent.id)
      .order("created_at", { ascending: true })
      .limit(50);

    initialMessages = (msgs ?? []) as ConversationMessage[];
  }

  return (
    <WinstonChatClient
      initialMessages={initialMessages}
      initialConversationId={initialConversationId}
      initialConversations={conversations}
      initialUsage={usage}
      activeProjects={activeProjects}
    />
  );
}
