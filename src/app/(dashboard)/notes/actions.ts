"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ActionResult, Note } from "@/lib/notes/types";

const titleSchema = z.string().trim().min(1, "Title is required");

export async function getNotes(): Promise<Note[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getNotes:", error);
    return [];
  }

  return (data ?? []) as Note[];
}

export async function createNote(): Promise<ActionResult<Note>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: "Untitled",
      content: null,
    })
    .select()
    .single();

  if (error) {
    console.error("createNote:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/notes");
  return { success: true, data: data as Note };
}

export async function updateNoteTitle(
  id: string,
  title: string
): Promise<ActionResult> {
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid title",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notes")
    .update({
      title: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("updateNoteTitle:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/notes");
  return { success: true };
}

export async function updateNoteContent(
  id: string,
  content: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notes")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("updateNoteContent:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/notes");
  return { success: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteNote:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/notes");
  return { success: true };
}
