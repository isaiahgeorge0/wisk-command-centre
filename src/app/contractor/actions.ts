"use server";

import { z } from "zod";

import { formatPropertyDate } from "@/lib/properties/format";
import type {
  ActionResult,
  ContractorAccessRequest,
  JobSheetUpdate,
  JobSheetWithDetails,
} from "@/lib/properties/types";
import { createAdminClient } from "@/lib/supabase/admin";

function siteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://app.wiskapp.com";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getJobSheetByToken(
  token: string
): Promise<JobSheetWithDetails | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_sheets")
    .select(
      `
      *,
      contractors(*),
      maintenance_tickets(title, description, priority, category, status),
      properties(name, address_line1, address_line2, city, postcode),
      job_sheet_updates(*),
      contractor_access_requests(*)
    `
    )
    .eq("token", token)
    .single();

  if (error || !data) return null;

  if (data.status === "sent") {
    await admin
      .from("job_sheets")
      .update({ status: "viewed" })
      .eq("token", token);
    data.status = "viewed";
  }

  const updates = (data.job_sheet_updates ?? []) as JobSheetUpdate[];
  updates.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  data.job_sheet_updates = updates;

  return data as JobSheetWithDetails;
}

export async function getTenantContactForJobSheet(
  token: string
): Promise<{ name: string; email: string | null; phone: string | null } | null> {
  const admin = createAdminClient();
  const { data: jobSheet } = await admin
    .from("job_sheets")
    .select("property_id")
    .eq("token", token)
    .single();

  if (!jobSheet) return null;

  const { data: tenant } = await admin
    .from("tenants")
    .select("first_name, last_name, email, phone")
    .eq("property_id", jobSheet.property_id)
    .eq("status", "active")
    .maybeSingle();

  if (!tenant) return null;

  return {
    name: `${tenant.first_name} ${tenant.last_name}`.trim(),
    email: tenant.email ?? null,
    phone: tenant.phone ?? null,
  };
}

export async function addJobSheetUpdate(
  token: string,
  content: string
): Promise<ActionResult<JobSheetUpdate>> {
  const schema = z.object({
    content: z.string().trim().min(1).max(2000),
  });
  const parsed = schema.safeParse({ content });
  if (!parsed.success) {
    return { success: false, error: "Update cannot be empty." };
  }

  const admin = createAdminClient();
  const { data: jobSheet } = await admin
    .from("job_sheets")
    .select("id")
    .eq("token", token)
    .single();

  if (!jobSheet) return { success: false, error: "Job sheet not found." };

  const { data, error } = await admin
    .from("job_sheet_updates")
    .insert({
      job_sheet_id: jobSheet.id,
      author: "contractor",
      content: parsed.data.content,
    })
    .select()
    .single();

  if (error) {
    console.error("addJobSheetUpdate:", error);
    return { success: false, error: "Could not save update." };
  }

  await admin
    .from("job_sheets")
    .update({ status: "in_progress" })
    .eq("token", token)
    .in("status", ["viewed", "sent"]);

  return { success: true, data: data as JobSheetUpdate };
}

export async function setPlannedVisitDate(
  token: string,
  date: string
): Promise<ActionResult> {
  const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
  const parsed = schema.safeParse({ date });
  if (!parsed.success) return { success: false, error: "Invalid date." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("job_sheets")
    .update({ planned_visit_date: parsed.data.date })
    .eq("token", token);

  if (error) {
    console.error("setPlannedVisitDate:", error);
    return { success: false, error: "Could not save date." };
  }
  return { success: true };
}

export async function requestTenantAccess(
  token: string,
  requestedDate: string,
  requestedTime: string | null,
  notes: string | null
): Promise<ActionResult<ContractorAccessRequest>> {
  const admin = createAdminClient();

  const { data: jobSheet } = await admin
    .from("job_sheets")
    .select("id, property_id")
    .eq("token", token)
    .single();

  if (!jobSheet) return { success: false, error: "Job sheet not found." };

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, email, first_name, portal_user_id")
    .eq("property_id", jobSheet.property_id)
    .eq("status", "active")
    .maybeSingle();

  if (!tenant) return { success: false, error: "No active tenant found." };

  const { data, error } = await admin
    .from("contractor_access_requests")
    .insert({
      job_sheet_id: jobSheet.id,
      property_id: jobSheet.property_id,
      tenant_id: tenant.id,
      requested_date: requestedDate,
      requested_time: requestedTime,
      notes,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("requestTenantAccess:", error);
    return { success: false, error: "Could not submit request." };
  }

  if (tenant.portal_user_id && tenant.email) {
    const { data: jobSheetFull } = await admin
      .from("job_sheets")
      .select(
        `
        contractors(name),
        maintenance_tickets(title)
      `
      )
      .eq("id", jobSheet.id)
      .single();

    if (jobSheetFull) {
      const { sendContractorAccessRequestEmail } = await import(
        "@/lib/properties/emails"
      );
      await sendContractorAccessRequestEmail({
        to: tenant.email,
        tenantName: tenant.first_name ?? "there",
        contractorName:
          (jobSheetFull.contractors as unknown as { name: string } | null)
            ?.name ?? "A contractor",
        jobTitle:
          (
            jobSheetFull.maintenance_tickets as unknown as {
              title: string;
            } | null
          )?.title ?? "Maintenance job",
        requestedDate: formatPropertyDate(requestedDate),
        requestedTime,
        portalUrl: siteUrl("/portal/maintenance"),
      });
    }
  }

  return { success: true, data: data as ContractorAccessRequest };
}
