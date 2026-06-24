"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  portalAppUrl,
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
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceTicket,
  PropertyDocument,
} from "@/lib/properties/types";
import { requireTenantContext } from "@/lib/portal/get-tenant-context";
import type { PortalTheme } from "@/lib/portal/types";
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

  const admin = await import("@/lib/supabase/admin").then((m) =>
    m.createAdminClient()
  );

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
      propertyUrl: portalAppUrl(
        `/properties/${property.id}?tab=maintenance`
      ),
    });
  }

  revalidatePath("/portal");
  revalidatePath("/portal/maintenance");
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
