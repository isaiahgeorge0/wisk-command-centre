"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { emptyToNull, parseLeadValue } from "@/lib/leads/format";
import type {
  ActionResult,
  ConvertLeadToProjectInput,
  Lead,
  LeadActivity,
  LeadActivityFormInput,
  LeadFormInput,
  LeadWithActivity,
} from "@/lib/leads/types";
import {
  LEAD_ACTIVITY_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/leads/types";

const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  source: z.enum(LEAD_SOURCES),
  service_interest: z.string().trim().min(1, "Service interest is required"),
  status: z.enum(LEAD_STATUSES),
  value: z.string().optional(),
  notes: z.string().optional(),
});

function revalidateLeadPaths() {
  revalidatePath("/leads");
  revalidatePath("/");
}

function toDbPayload(input: LeadFormInput) {
  return {
    name: input.name.trim(),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    source: input.source,
    service_interest: input.service_interest.trim(),
    status: input.status,
    value: parseLeadValue(input.value),
    notes: emptyToNull(input.notes),
  };
}

function contactedAtForStatus(
  status: LeadStatus,
  existingContactedAt: string | null
): string | null | undefined {
  if (status === "contacted" && !existingContactedAt) {
    return new Date().toISOString();
  }
  return undefined;
}

export async function getLeads(): Promise<Lead[]> {
  const leads = await getLeadsWithActivity();
  return leads;
}

export async function getLeadsWithActivity(): Promise<LeadWithActivity[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLeadsWithActivity:", error);
    return [];
  }

  const leadList = (leads ?? []) as Lead[];
  if (leadList.length === 0) return [];

  const leadIds = leadList.map((lead) => lead.id);

  const { data: activities, error: activityError } = await supabase
    .from("lead_activities")
    .select("lead_id, created_at")
    .eq("user_id", userId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (activityError) {
    console.error("getLeadsWithActivity activities:", activityError);
  }

  const lastActivityMap = new Map<string, string>();
  for (const row of activities ?? []) {
    if (row.lead_id && !lastActivityMap.has(row.lead_id)) {
      lastActivityMap.set(row.lead_id, row.created_at);
    }
  }

  return leadList.map((lead) => ({
    ...lead,
    last_activity_at: lastActivityMap.get(lead.id) ?? null,
  }));
}

export async function createLead(
  input: LeadFormInput
): Promise<ActionResult<Lead>> {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();
  const payload = toDbPayload(parsed.data);
  const contactedAt =
    parsed.data.status === "contacted" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: userId,
      ...payload,
      contacted_at: contactedAt,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createLead:", error);
    return { success: false, error: error.message };
  }

  revalidateLeadPaths();
  return { success: true, data: data as Lead };
}

export async function updateLead(
  id: string,
  input: LeadFormInput
): Promise<ActionResult<Lead>> {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("contacted_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Lead not found" };
  }

  const payload = {
    ...toDbPayload(parsed.data),
    contacted_at:
      contactedAtForStatus(parsed.data.status, existing.contacted_at) ??
      existing.contacted_at,
  };

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateLead:", error);
    return { success: false, error: error.message };
  }

  revalidateLeadPaths();
  return { success: true, data: data as Lead };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<ActionResult<Lead>> {
  if (!LEAD_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("contacted_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Lead not found" };
  }

  const updatePayload: Record<string, unknown> = { status };
  const contactedAt = contactedAtForStatus(status, existing.contacted_at);
  if (contactedAt) {
    updatePayload.contacted_at = contactedAt;
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("updateLeadStatus:", error);
    return { success: false, error: error.message };
  }

  revalidateLeadPaths();
  return { success: true, data: data as Lead };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteLead:", error);
    return { success: false, error: error.message };
  }

  revalidateLeadPaths();
  return { success: true };
}

const convertLeadInputSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  deadline: z.string().optional(),
  value: z.string().optional(),
  first_task: z.string().optional(),
});

export async function convertLeadToProject(
  leadId: string,
  input: ConvertLeadToProjectInput
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = convertLeadInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", userId)
    .single();

  if (leadError || !lead) {
    console.error("convertLeadToProject - fetch lead:", leadError);
    return { success: false, error: "Lead not found." };
  }

  const deadline = emptyToNull(parsed.data.deadline);
  const value =
    parseLeadValue(parsed.data.value) ?? lead.value ?? null;
  const firstTask = emptyToNull(parsed.data.first_task);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      project_name: parsed.data.name,
      client_name: lead.name,
      service_type: lead.service_interest,
      status: "active",
      value,
      deadline,
      notes: lead.notes ?? null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("convertLeadToProject - create project:", projectError);
    return { success: false, error: "Could not create project. Please try again." };
  }

  if (firstTask) {
    const { error: taskError } = await supabase.from("tasks").insert({
      user_id: userId,
      project_id: project.id,
      title: firstTask,
      completed: false,
    });

    if (taskError) {
      console.error("convertLeadToProject - create task:", taskError);
    } else {
      revalidatePath("/tasks");
    }
  }

  if (lead.status !== "won") {
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "won", updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("convertLeadToProject - update lead status:", updateError);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, data: { projectId: project.id } };
}

// ─── Lead activities ──────────────────────────────────────────────────────────

export async function getLeadActivities(
  leadId: string
): Promise<ActionResult<LeadActivity[]>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("lead_activities")
    .select("id, lead_id, user_id, activity_type, title, content, metadata, created_at")
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLeadActivities:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as LeadActivity[] };
}

const activityFormSchema = z.object({
  activity_type: z.enum(LEAD_ACTIVITY_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().optional(),
});

export async function addLeadActivity(
  leadId: string,
  input: LeadActivityFormInput
): Promise<ActionResult<LeadActivity>> {
  const parsed = activityFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      user_id: userId,
      activity_type: parsed.data.activity_type,
      title: parsed.data.title,
      content: parsed.data.content?.trim() || null,
    })
    .select("id, lead_id, user_id, activity_type, title, content, metadata, created_at")
    .single();

  if (error) {
    console.error("addLeadActivity:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/leads");
  return { success: true, data: data as LeadActivity };
}

export async function deleteLeadActivity(
  activityId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("lead_activities")
    .delete()
    .eq("id", activityId)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteLeadActivity:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/leads");
  return { success: true };
}

export async function setLeadFollowUp(
  leadId: string,
  date: string | null
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("leads")
    .update({ follow_up_date: date })
    .eq("id", leadId)
    .eq("user_id", userId);

  if (error) {
    console.error("setLeadFollowUp:", error);
    return { success: false, error: error.message };
  }

  if (date) {
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: userId,
      activity_type: "follow_up_set",
      title: `Follow-up set for ${date}`,
      metadata: { date },
    });
  }

  revalidatePath("/leads");
  return { success: true };
}
