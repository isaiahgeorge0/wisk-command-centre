"use server";

import { revalidatePath } from "next/cache";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ActionResult } from "@/lib/tasks/types";
import type { ConversationMessage } from "@/lib/ai/types";

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
