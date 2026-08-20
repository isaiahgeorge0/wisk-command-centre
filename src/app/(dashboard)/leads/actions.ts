"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasResearchAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import { emptyToNull, parseLeadValue } from "@/lib/leads/format";
import type {
  ActionResult,
  CallNotesActions,
  CallNotesResult,
  ConvertLeadToProjectInput,
  Lead,
  LeadActivity,
  LeadResearchBrief,
  LeadActivityFormInput,
  LeadFormInput,
  LeadWithActivity,
} from "@/lib/leads/types";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import {
  clampCitedClaims,
  formatCitationsBlock,
} from "@/lib/research/citations";
import { routeAndSearchResearchTools } from "@/lib/research/tool-routing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_ACTIVITY_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_VALUE_TYPES,
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
  value_type: z.enum(LEAD_VALUE_TYPES).optional(),
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
    value_type: input.value_type === "monthly" ? "monthly" : "one_time",
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not save this lead."),
    };
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not update this lead."),
    };
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not update this lead's status."),
    };
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not delete this lead."),
    };
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
  // Projects store a single one-time value. Monthly lead values are annualized
  // (×12) at conversion unless the user overrode the amount in the modal.
  const typedLead = lead as Lead;
  const explicitValue = parseLeadValue(parsed.data.value);
  const value =
    explicitValue ??
    (typedLead.value != null
      ? typedLead.value_type === "monthly"
        ? typedLead.value * 12
        : typedLead.value
      : null);
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not load activities for this lead."),
    };
  }

  return { success: true, data: (data ?? []) as LeadActivity[] };
}

const activityFormSchema = z.object({
  activity_type: z.enum(LEAD_ACTIVITY_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().optional(),
});

const leadResearchInputSchema = z.object({
  leadId: z.string().uuid(),
});

const leadResearchOutputSchema = z.object({
  summary: z.string().trim().min(1),
  companyBackground: z.array(
    z.object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
  ),
  budgetSignals: z.array(
    z.object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
  ),
  painPoints: z.array(
    z.object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
  ),
});

function formatLeadContext(lead: Lead, recentActivities: LeadActivity[]): string {
  const activities =
    recentActivities.length > 0
      ? recentActivities
          .slice(0, 5)
          .map((activity) => {
            const detail = activity.content ? `: ${activity.content}` : "";
            return `- [${activity.activity_type}] ${activity.title}${detail}`;
          })
          .join("\n")
      : "No recent lead activities.";

  return `Lead profile:
- Name: ${lead.name}
- Service interest: ${lead.service_interest}
- Stage: ${lead.status}
- Value: ${lead.value ?? "not set"} (${lead.value_type ?? "one_time"})
- Notes: ${lead.notes?.trim() || "none"}
- Email: ${lead.email ?? "none"}
- Phone: ${lead.phone ?? "none"}

Recent lead activity:
${activities}`;
}

export async function generateLeadResearchBrief(
  input: { leadId: string }
): Promise<ActionResult<LeadResearchBrief>> {
  const parsed = leadResearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const { supabase, userId } = await getScopedSupabase();
    const admin = createAdminClient();
    const canAccessResearch = await hasResearchAccess(userId, admin);

    if (!canAccessResearch) {
      return {
        success: false,
        error: "Research access not enabled for this account.",
      };
    }

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", parsed.data.leadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (leadError || !leadRow) {
      return { success: false, error: "Lead not found." };
    }

    const lead = leadRow as Lead;
    const activitiesResult = await getLeadActivities(lead.id);
    const recentActivities = activitiesResult.success
      ? (activitiesResult.data ?? [])
      : [];

    const leadContext = formatLeadContext(lead, recentActivities);
    const routed = await routeAndSearchResearchTools({
      userId,
      usageFeature: "lead_research_brief",
      routingUserPrompt: `${leadContext}

Decide the best search plan for producing a lead intelligence brief with company background, budget signals, and pain points.`,
      fallbackTavilyQuery: `${lead.name} company latest news pricing services`,
      fallbackExaQuery: `${lead.name} company profile team industry customers`,
    });

    const citations = routed.citations;

    if (citations.length === 0) {
      return {
        success: false,
        error: "No research sources were found for this lead.",
      };
    }

    const synthesisSystem = cachedSystemParts([
      {
        text: `You are Winston generating a lead intelligence brief.
Return ONLY valid JSON:
{
  "summary": "1-2 sentence high-level read",
  "companyBackground": [{ "text": "claim", "citationIndex": 0 }],
  "budgetSignals": [{ "text": "claim", "citationIndex": 0 }],
  "painPoints": [{ "text": "claim", "citationIndex": 0 }]
}
Rules:
- Every claim must cite exactly one source index from the provided source list.
- No claim without citation.
- Keep each claim concise and specific.
- Use only facts from sources; do not invent.
- If a section has weak evidence, return an empty array for that section.
- Do not include markdown.`,
        cache: true,
      },
    ]);

    const synthesisPrompt = `${leadContext}

Sources:
${formatCitationsBlock(citations)}

Generate the lead intelligence brief JSON now.`;

    const synthesisResponse = await callAnthropicJson({
      system: synthesisSystem,
      userPrompt: synthesisPrompt,
      maxTokens: 1000,
    });

    await logUsage(
      userId,
      "lead_research_brief",
      synthesisResponse.usage.input,
      synthesisResponse.usage.output
    );

    const synthesis = leadResearchOutputSchema.parse(
      JSON.parse(synthesisResponse.jsonText)
    );

    return {
      success: true,
      data: {
        summary: synthesis.summary,
        companyBackground: clampCitedClaims(
          synthesis.companyBackground,
          citations.length
        ),
        budgetSignals: clampCitedClaims(
          synthesis.budgetSignals,
          citations.length
        ),
        painPoints: clampCitedClaims(synthesis.painPoints, citations.length),
        citations,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not generate this lead intelligence brief."
      ),
    };
  }
}

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
    return {
      success: false,
      error: toSafeActionError(error, "Could not save this activity."),
    };
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not delete this activity."),
    };
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
    return {
      success: false,
      error: toSafeActionError(error, "Could not set the follow-up date."),
    };
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

async function findProjectForLead(
  supabase: Awaited<ReturnType<typeof getScopedSupabase>>["supabase"],
  userId: string,
  leadName: string
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("client_name", leadName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function applyCallNotesResult(
  leadId: string,
  result: CallNotesResult,
  selectedActions: CallNotesActions
): Promise<ActionResult<Lead>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Lead not found" };
  }

  const updatePayload: Record<string, unknown> = {};
  let tasksCreated = false;

  if (selectedActions.saveNotes) {
    const timestamp = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const entry = `\n\n---\nWinston call notes (${timestamp})\n${result.summary.trim()}`;
    const currentNotes = existing.notes?.trim() ?? "";
    updatePayload.notes = currentNotes
      ? `${currentNotes}${entry}`
      : result.summary.trim();
  }

  if (
    selectedActions.updateStage &&
    result.suggestedStage &&
    LEAD_STATUSES.includes(result.suggestedStage as LeadStatus)
  ) {
    updatePayload.status = result.suggestedStage;
    if (result.suggestedStage === "contacted" && !existing.contacted_at) {
      updatePayload.contacted_at = new Date().toISOString();
    }
  }

  if (selectedActions.updateValue && result.suggestedValue != null) {
    updatePayload.value = result.suggestedValue;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", leadId)
      .eq("user_id", userId);

    if (updateError) {
      return {
        success: false,
        error: toSafeActionError(
          updateError,
          "Could not save call notes to this lead."
        ),
      };
    }
  }

  if (selectedActions.setFollowUp && result.followUpDate) {
    const followUpDate = result.followUpDate.slice(0, 10);
    const { error: followUpError } = await supabase
      .from("leads")
      .update({ follow_up_date: followUpDate })
      .eq("id", leadId)
      .eq("user_id", userId);

    if (followUpError) {
      return {
        success: false,
        error: toSafeActionError(
          followUpError,
          "Could not set the follow-up date."
        ),
      };
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: userId,
      activity_type: "follow_up_set",
      title: `Follow-up set for ${followUpDate}`,
      metadata: { date: followUpDate },
    });
  }

  if (selectedActions.createTasks.length > 0) {
    const projectId = await findProjectForLead(
      supabase,
      userId,
      existing.name
    );

    const { error: taskError } = await supabase.from("tasks").insert(
      selectedActions.createTasks.map((title) => ({
        user_id: userId,
        title: title.trim(),
        completed: false,
        project_id: projectId,
        priority: "medium",
      }))
    );

    if (taskError) {
      return {
        success: false,
        error: toSafeActionError(
          taskError,
          "Could not create tasks from these call notes."
        ),
      };
    }

    tasksCreated = true;
  }

  const { error: activityError } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    user_id: userId,
    activity_type: "ai_notes",
    title: "Call notes processed by Winston",
    content: result.summary,
    metadata: {
      sentiment: result.sentiment,
      keyDetails: result.keyDetails,
      objections: result.objections,
      nextSteps: result.nextSteps,
    },
  });

  if (activityError) {
    return {
      success: false,
      error: toSafeActionError(
        activityError,
        "Could not save the call notes activity."
      ),
    };
  }

  const { data: updatedLead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !updatedLead) {
    console.error("applyCallNotesResult fetch updated lead:", fetchError);
    return { success: false, error: "Could not load updated lead" };
  }

  revalidatePath("/leads");
  if (tasksCreated) {
    revalidatePath("/tasks");
    revalidatePath("/");
  }

  return { success: true, data: updatedLead as Lead };
}
