"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { emptyToNull } from "@/lib/tasks/format";
import type {
  ActionResult,
  StandaloneCalendarEvent,
  StandaloneCalendarEventFormInput,
} from "@/lib/calendar/types";

const STANDALONE_EVENT_TYPES = ["lifestyle", "other"] as const;

const calendarEventFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  end_date: z.string().optional(),
  event_type: z.enum(STANDALONE_EVENT_TYPES),
  notes: z.string().optional(),
});

function toDbPayload(input: StandaloneCalendarEventFormInput) {
  return {
    title: input.title.trim(),
    date: input.date,
    end_date: emptyToNull(input.end_date),
    event_type: input.event_type,
    notes: emptyToNull(input.notes),
  };
}

function mapRow(row: StandaloneCalendarEvent): StandaloneCalendarEvent {
  return row;
}

export async function getCalendarEvents(): Promise<StandaloneCalendarEvent[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    console.error("getCalendarEvents:", error);
    return [];
  }

  return (data ?? []).map(mapRow);
}

export async function createCalendarEvent(
  input: StandaloneCalendarEventFormInput
): Promise<ActionResult<StandaloneCalendarEvent>> {
  const parsed = calendarEventFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...toDbPayload(parsed.data), user_id: userId })
    .select("*")
    .single();

  if (error) {
    console.error("createCalendarEvent:", error);
    return { success: false, error: "Could not create calendar event." };
  }

  revalidatePath("/calendar");
  return { success: true, data: mapRow(data) };
}

export async function updateCalendarEvent(
  id: string,
  input: StandaloneCalendarEventFormInput
): Promise<ActionResult<StandaloneCalendarEvent>> {
  const parsed = calendarEventFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...toDbPayload(parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateCalendarEvent:", error);
    return { success: false, error: "Could not update calendar event." };
  }

  revalidatePath("/calendar");
  return { success: true, data: mapRow(data) };
}

export async function deleteCalendarEvent(
  id: string
): Promise<ActionResult<void>> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteCalendarEvent:", error);
    return { success: false, error: "Could not delete calendar event." };
  }

  revalidatePath("/calendar");
  return { success: true, data: undefined };
}
