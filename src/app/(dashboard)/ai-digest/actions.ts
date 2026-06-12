"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { WINSTON_MONTHLY_TOKEN_LIMIT } from "@/lib/ai/constants";
import type { ActionResult } from "@/lib/tasks/types";
import type { ConversationMessage, MonthlyUsage } from "@/lib/ai/types";

export async function getConversationHistory(): Promise<
  ActionResult<ConversationMessage[]>
> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("ai_conversation_messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("getConversationHistory:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as ConversationMessage[] };
}

export async function getMonthlyUsage(): Promise<ActionResult<MonthlyUsage>> {
  const { supabase, userId } = await getScopedSupabase();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const resetDate = new Date(monthStart);
  resetDate.setMonth(resetDate.getMonth() + 1);

  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("feature, input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  if (error) {
    console.error("getMonthlyUsage:", error);
    return { success: false, error: error.message };
  }

  let chatTokens = 0;
  let digestTokens = 0;

  for (const row of data ?? []) {
    const tokens = (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
    if (row.feature === "chat") chatTokens += tokens;
    else if (row.feature === "digest") digestTokens += tokens;
  }

  const total = chatTokens + digestTokens;
  const limit = WINSTON_MONTHLY_TOKEN_LIMIT;
  const percentage = Math.min(
    100,
    Math.round((total / limit) * 100)
  );

  return {
    success: true,
    data: {
      chatTokens,
      digestTokens,
      total,
      limit,
      percentage,
      resetDate: resetDate.toISOString(),
    },
  };
}

export async function clearConversation(): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("ai_conversation_messages")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("clearConversation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/ai-digest/chat");
  return { success: true };
}
