"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { CustomInbox, EmailRule } from "@/lib/email/types";
import type { ActionResult } from "@/lib/tasks/types";

const HEX_COLOUR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const nameSchema = z.string().trim().min(1, "Name is required");

const colourSchema = z
  .string()
  .trim()
  .regex(HEX_COLOUR_REGEX, "Colour must be a valid hex string");

const emailRuleSchema = z.object({
  ruleType: z.enum(["sender", "domain"]),
  value: z.string().trim().min(1, "Value is required"),
  targetType: z.enum(["custom_inbox", "default_category"]),
  targetId: z.string().trim().min(1, "Target is required"),
  applyType: z.enum(["always", "once"]),
});

export async function getCustomInboxes(): Promise<CustomInbox[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("custom_inboxes")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getCustomInboxes:", error);
    return [];
  }

  return (data ?? []) as CustomInbox[];
}

export async function createCustomInbox(
  name: string,
  colour: string
): Promise<ActionResult<CustomInbox>> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Invalid name",
    };
  }

  const parsedColour = colourSchema.safeParse(colour);
  if (!parsedColour.success) {
    return {
      success: false,
      error: parsedColour.error.issues[0]?.message ?? "Invalid colour",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: existing } = await supabase
    .from("custom_inboxes")
    .select("display_order")
    .eq("user_id", userId)
    .order("display_order", { ascending: false })
    .limit(1);

  const displayOrder = ((existing?.[0]?.display_order as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("custom_inboxes")
    .insert({
      user_id: userId,
      name: parsedName.data,
      colour: parsedColour.data,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("createCustomInbox:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/email");
  return { success: true, data: data as CustomInbox };
}

export async function updateCustomInbox(
  id: string,
  name: string,
  colour: string
): Promise<ActionResult> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Invalid name",
    };
  }

  const parsedColour = colourSchema.safeParse(colour);
  if (!parsedColour.success) {
    return {
      success: false,
      error: parsedColour.error.issues[0]?.message ?? "Invalid colour",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("custom_inboxes")
    .update({
      name: parsedName.data,
      colour: parsedColour.data,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("updateCustomInbox:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/email");
  return { success: true };
}

export async function deleteCustomInbox(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error: rulesError } = await supabase
    .from("email_rules")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", "custom_inbox")
    .eq("target_id", id);

  if (rulesError) {
    console.error("deleteCustomInbox rules:", rulesError);
    return { success: false, error: rulesError.message };
  }

  const { error } = await supabase
    .from("custom_inboxes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteCustomInbox:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/email");
  return { success: true };
}

export async function getEmailRules(): Promise<EmailRule[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("email_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getEmailRules:", error);
    return [];
  }

  return (data ?? []) as EmailRule[];
}

export async function createEmailRule(input: {
  ruleType: "sender" | "domain";
  value: string;
  targetType: "custom_inbox" | "default_category";
  targetId: string;
  applyType: "always" | "once";
}): Promise<ActionResult<EmailRule>> {
  const parsed = emailRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid rule",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("email_rules")
    .insert({
      user_id: userId,
      rule_type: parsed.data.ruleType,
      value: parsed.data.value,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId,
      apply_type: parsed.data.applyType,
    })
    .select()
    .single();

  if (error) {
    console.error("createEmailRule:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/email");
  return { success: true, data: data as EmailRule };
}

export async function deleteEmailRule(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("email_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteEmailRule:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/email");
  return { success: true };
}
