"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { emptyToNull, parseLeadValue } from "@/lib/leads/format";
import type { ActionResult, Lead, LeadFormInput } from "@/lib/leads/types";
import {
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
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLeads:", error);
    return [];
  }

  return (data ?? []) as Lead[];
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

export async function convertLeadToProject(
  leadId: string
): Promise<ActionResult<{ projectId: string }>> {
  const { supabase, userId } = await getScopedSupabase();

  // Fetch the lead
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

  // Create the project from lead data
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      project_name: lead.service_interest,
      client_name: lead.name,
      service_type: lead.service_interest,
      status: "active",
      value: lead.value ?? null,
      notes: lead.notes ?? null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("convertLeadToProject - create project:", projectError);
    return { success: false, error: "Could not create project. Please try again." };
  }

  // Mark lead as won if not already
  if (lead.status !== "won") {
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "won", updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("convertLeadToProject - update lead status:", updateError);
      // Non-fatal — project was created successfully, just log it
    }
  }

  revalidatePath("/leads");
  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, data: { projectId: project.id } };
}
