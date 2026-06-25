"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  sendMaintenanceRequestEmail,
} from "@/lib/properties/emails";
import {
  formatPropertyAddress,
  formatPropertyDate,
} from "@/lib/properties/format";
import {
  getMaintenancePriorityDisplayName,
} from "@/lib/properties/display-names";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type {
  ActionResult,
  ContractorAccessRequestWithDetails,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceTicket,
  PropertyDocument,
  TenantMessage,
} from "@/lib/properties/types";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";
import type { PortalTheme } from "@/lib/portal/types";
import { portalUrl } from "@/lib/url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const submitMaintenanceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  category: z.enum([
    "plumbing",
    "electrical",
    "heating",
    "structural",
    "appliance",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "emergency"]),
  winstonAttempted: z.boolean().optional(),
  winstonSteps: z.array(z.string()).optional(),
});

export async function submitPortalMaintenanceRequest(
  input: z.infer<typeof submitMaintenanceSchema>
): Promise<ActionResult<MaintenanceTicket>> {
  const parsed = submitMaintenanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { tenant, property } = await requireTenantContext();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      user_id: tenant.user_id,
      property_id: tenant.property_id,
      tenant_id: tenant.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      status: "new",
      priority: parsed.data.priority,
      category: parsed.data.category,
      reported_date: today,
      reported_by_tenant: true,
    })
    .select()
    .single();

  if (error) {
    console.error("submitPortalMaintenanceRequest:", error);
    return { success: false, error: error.message };
  }

  const admin = createAdminClient();

  const taskTitle = `Maintenance: ${parsed.data.title} — ${formatPropertyAddress(property)}`;
  const winstonResolved = parsed.data.winstonAttempted === true;
  const isEmergency = parsed.data.priority === "emergency";
  const taskNotes = [
    winstonResolved
      ? "Winston attempted to resolve this issue with the tenant."
      : "Tenant submitted this without Winston triage.",
    `Priority: ${parsed.data.priority}`,
    `Category: ${parsed.data.category}`,
    `Tenant: ${getTenantFullName(tenant)}`,
    ``,
    `View ticket: ${portalUrl(`/properties/${property.id}?tab=maintenance`)}`,
  ].join("\n");

  const { error: taskError } = await admin.from("tasks").insert({
    user_id: tenant.user_id,
    title: taskTitle,
    completed: false,
    priority: isEmergency
      ? "high"
      : parsed.data.priority === "high"
        ? "high"
        : "medium",
    raw_content: taskNotes,
    due_date: null,
  });

  if (taskError) {
    console.error("submitPortalMaintenanceRequest - create task:", taskError);
  }

  const [{ data: landlordUser }, { data: prefs }] = await Promise.all([
    admin.from("users").select("email, name").eq("id", tenant.user_id).maybeSingle(),
    admin
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", tenant.user_id)
      .maybeSingle(),
  ]);

  const landlordEmail = landlordUser?.email;
  if (landlordEmail) {
    const landlordName =
      prefs?.display_name?.trim() ||
      landlordUser?.name?.trim() ||
      "there";
    const tenantName = getTenantFullName(tenant);
    const propertyAddress = formatPropertyAddress(property);

    await sendMaintenanceRequestEmail({
      to: landlordEmail,
      landlordName,
      tenantName,
      propertyAddress,
      issueTitle: parsed.data.title,
      issueDescription: parsed.data.description,
      priority: getMaintenancePriorityDisplayName(
        parsed.data.priority as MaintenancePriority
      ),
      winstonAttempted: parsed.data.winstonAttempted ?? false,
      winstonSteps: parsed.data.winstonSteps ?? null,
      propertyUrl: portalUrl(
        `/properties/${property.id}?tab=maintenance`
      ),
    });
  }

  revalidatePath("/portal");
  revalidatePath("/portal/maintenance");
  revalidatePath("/tasks");
  return { success: true, data: data as MaintenanceTicket };
}

export async function getPortalMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("reported_date", { ascending: false });

  if (error) {
    console.error("getPortalMaintenanceTickets:", error);
    return [];
  }

  return (data ?? []) as MaintenanceTicket[];
}

export async function getPortalSharedDocuments(): Promise<PropertyDocument[]> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_documents")
    .select("*")
    .eq("property_id", tenant.property_id)
    .eq("shared_with_tenant", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPortalSharedDocuments:", error);
    return [];
  }

  return (data ?? []) as PropertyDocument[];
}

export async function getPortalDocumentUrl(
  documentId: string
): Promise<ActionResult<string>> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("property_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("property_id", tenant.property_id)
    .eq("shared_with_tenant", true)
    .maybeSingle();

  if (error || !document) {
    return { success: false, error: "Document not found" };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("property-documents")
    .createSignedUrl(document.file_path as string, 3600);

  if (signError || !signed?.signedUrl) {
    return { success: false, error: "Could not open document" };
  }

  return { success: true, data: signed.signedUrl };
}

export async function signOutPortal(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

const portalThemeSchema = z.enum(["light", "dark"]);

export async function updatePortalTheme(
  theme: PortalTheme
): Promise<ActionResult> {
  const parsed = portalThemeSchema.safeParse(theme);
  if (!parsed.success) {
    return { success: false, error: "Invalid theme" };
  }

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenants")
    .update({ portal_theme: parsed.data })
    .eq("id", tenant.id);

  if (error) {
    console.error("updatePortalTheme:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export type PortalMaintenanceInput = {
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  winstonAttempted?: boolean;
  winstonSteps?: string[];
};

export { formatPropertyDate };

const tenantMessageSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export async function getTenantMessages(): Promise<TenantMessage[]> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_messages")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getTenantMessages:", error);
    return [];
  }

  return (data ?? []) as TenantMessage[];
}

export async function sendTenantMessage(
  message: string
): Promise<ActionResult<TenantMessage>> {
  const parsed = tenantMessageSchema.safeParse({ message });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message",
    };
  }

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  if (!tenant.portal_user_id) {
    return { success: false, error: "Portal account not linked" };
  }

  const { data, error } = await supabase
    .from("tenant_messages")
    .insert({
      property_id: tenant.property_id,
      tenant_id: tenant.id,
      landlord_user_id: tenant.user_id,
      sender_type: "tenant",
      sender_id: tenant.portal_user_id,
      message: parsed.data.message,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("sendTenantMessage:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as TenantMessage };
}

export async function markTenantMessagesAsRead(): Promise<ActionResult> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_messages")
    .update({ read: true })
    .eq("tenant_id", tenant.id)
    .eq("sender_type", "landlord")
    .eq("read", false);

  if (error) {
    console.error("markTenantMessagesAsRead:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getPortalUnreadCount(): Promise<number> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("tenant_messages")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("sender_type", "landlord")
    .eq("read", false);

  if (error) {
    console.error("getPortalUnreadCount:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getLandlordLastSeen(): Promise<string | null> {
  const { tenant } = await requireTenantContext();
  const admin = await import("@/lib/supabase/admin").then((m) =>
    m.createAdminClient()
  );

  const { data, error } = await admin
    .from("user_preferences")
    .select("last_seen_at")
    .eq("user_id", tenant.user_id)
    .maybeSingle();

  if (error) {
    console.error("getLandlordLastSeen:", error);
    return null;
  }

  return data?.last_seen_at ?? null;
}

export async function updateTenantLastSeen(): Promise<void> {
  const { tenant } = await requireTenantContext();
  const admin = await import("@/lib/supabase/admin").then((m) =>
    m.createAdminClient()
  );

  await admin
    .from("tenants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", tenant.id);
}

export async function getContractorAccessRequests(): Promise<
  ContractorAccessRequestWithDetails[]
> {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contractor_access_requests")
    .select(`*, job_sheets(contractors(name), maintenance_tickets(title))`)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getContractorAccessRequests:", error);
    return [];
  }
  return (data ?? []) as ContractorAccessRequestWithDetails[];
}

export async function respondToAccessRequest(
  requestId: string,
  response: "approved" | "declined"
): Promise<ActionResult> {
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      response: z.enum(["approved", "declined"]),
    })
    .safeParse({ requestId, response });
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contractor_access_requests")
    .update({
      status: parsed.data.response,
      tenant_response_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("tenant_id", tenant.id);

  if (error) {
    console.error("respondToAccessRequest:", error);
    return { success: false, error: "Could not save response." };
  }

  revalidatePath("/portal/maintenance");
  revalidatePath("/properties/maintenance");
  revalidatePath("/properties", "layout");
  return { success: true };
}
