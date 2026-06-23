"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import {
  emptyToNull,
  parseOptionalNumber,
} from "@/lib/properties/format";
import type {
  ActionResult,
  MaintenanceTicket,
  MaintenanceTicketFormInput,
  MaintenanceTicketWithProperty,
  Property,
  PropertyCertificate,
  PropertyCertificateFormInput,
  PropertyFormInput,
  PropertyWithStats,
  RentPayment,
  RentPaymentFormInput,
  RentPaymentWithDetails,
  Tenant,
  TenantFormInput,
  TenantWithProperty,
} from "@/lib/properties/types";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/properties/constants";

const propertyFormSchema = z.object({
  name: z.string().trim().min(1, "Property name is required"),
  address_line1: z.string().trim().min(1, "Address line 1 is required"),
  address_line2: z.string().optional(),
  city: z.string().trim().min(1, "City is required"),
  postcode: z.string().trim().min(1, "Postcode is required"),
  property_type: z.enum(PROPERTY_TYPES as [string, ...string[]]),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  status: z.enum(PROPERTY_STATUSES as [string, ...string[]]),
  purchase_price: z.coerce.number().min(0).optional(),
  current_value: z.coerce.number().min(0).optional(),
  monthly_rent: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

function toDbPayload(input: PropertyFormInput) {
  return {
    name: input.name.trim(),
    address_line1: input.address_line1.trim(),
    address_line2: emptyToNull(input.address_line2),
    city: input.city.trim(),
    postcode: input.postcode.trim(),
    property_type: input.property_type,
    bedrooms: parseOptionalNumber(input.bedrooms),
    bathrooms: parseOptionalNumber(input.bathrooms),
    status: input.status,
    purchase_price: parseOptionalNumber(input.purchase_price),
    current_value: parseOptionalNumber(input.current_value),
    monthly_rent: parseOptionalNumber(input.monthly_rent),
    notes: emptyToNull(input.notes),
  };
}

function revalidatePropertyPaths(propertyId?: string) {
  revalidatePath("/properties/list");
  revalidatePath("/properties/dashboard");
  revalidatePath("/properties/tenants");
  revalidatePath("/properties/maintenance");
  revalidatePath("/properties/finances");
  revalidatePath("/");
  if (propertyId) {
    revalidatePath(`/properties/${propertyId}`);
  }
}

type TenantRentRow = { property_id: string; rent_amount: number };
type MaintenanceRow = { property_id: string };

async function attachPropertyStats(
  properties: Property[],
  userId: string,
  supabase: Awaited<ReturnType<typeof getScopedSupabase>>["supabase"]
): Promise<PropertyWithStats[]> {
  if (properties.length === 0) return [];

  const propertyIds = properties.map((property) => property.id);

  const [tenantsResult, maintenanceResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("property_id, rent_amount")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("property_id", propertyIds),
    supabase
      .from("maintenance_tickets")
      .select("property_id")
      .eq("user_id", userId)
      .in("status", ["new", "in_progress"])
      .in("property_id", propertyIds),
  ]);

  const tenantCounts = new Map<string, number>();
  const tenantRentTotals = new Map<string, number>();
  for (const tenant of (tenantsResult.data ?? []) as TenantRentRow[]) {
    tenantCounts.set(
      tenant.property_id,
      (tenantCounts.get(tenant.property_id) ?? 0) + 1
    );
    tenantRentTotals.set(
      tenant.property_id,
      (tenantRentTotals.get(tenant.property_id) ?? 0) +
        Number(tenant.rent_amount ?? 0)
    );
  }

  const maintenanceCounts = new Map<string, number>();
  for (const ticket of (maintenanceResult.data ?? []) as MaintenanceRow[]) {
    maintenanceCounts.set(
      ticket.property_id,
      (maintenanceCounts.get(ticket.property_id) ?? 0) + 1
    );
  }

  return properties.map((property) => {
    const tenantRentTotal = tenantRentTotals.get(property.id) ?? 0;
    return {
      ...property,
      tenant_count: tenantCounts.get(property.id) ?? 0,
      open_maintenance_count: maintenanceCounts.get(property.id) ?? 0,
      monthly_rent_total:
        property.monthly_rent ?? (tenantRentTotal > 0 ? tenantRentTotal : 0),
    };
  });
}

export async function getProperties(): Promise<PropertyWithStats[]> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProperties:", error);
    return [];
  }

  return attachPropertyStats((data ?? []) as Property[], userId, supabase);
}

export async function getProperty(
  id: string
): Promise<PropertyWithStats | null> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getProperty:", error);
    return null;
  }

  if (!data) return null;

  const [withStats] = await attachPropertyStats(
    [data as Property],
    userId,
    supabase
  );
  return withStats ?? null;
}

export async function createProperty(
  input: PropertyFormInput
): Promise<ActionResult<Property>> {
  const parsed = propertyFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      ...toDbPayload(parsed.data as PropertyFormInput),
    })
    .select()
    .single();

  if (error) {
    console.error("createProperty:", error);
    return { success: false, error: error.message };
  }

  revalidatePropertyPaths();
  return { success: true, data: data as Property };
}

export async function updateProperty(
  id: string,
  input: PropertyFormInput
): Promise<ActionResult<Property>> {
  const parsed = propertyFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("properties")
    .update(toDbPayload(parsed.data as PropertyFormInput))
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateProperty:", error);
    return { success: false, error: error.message };
  }

  revalidatePropertyPaths(id);
  return { success: true, data: data as Property };
}

export async function deleteProperty(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteProperty:", error);
    return { success: false, error: error.message };
  }

  revalidatePropertyPaths();
  return { success: true };
}

// ─── Tenant actions ───────────────────────────────────────────────────────────

const tenantFormSchema = z.object({
  property_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  tenancy_start: z.string().min(1, "Tenancy start is required"),
  tenancy_end: z.string().optional(),
  rent_amount: z.coerce.number().min(0, "Rent amount is required"),
  rent_frequency: z.enum(["weekly", "monthly"]),
  deposit_amount: z.coerce.number().min(0).optional(),
  deposit_protected: z.boolean(),
  status: z.enum(["active", "notice", "ended"]),
  notes: z.string().optional(),
});

function toTenantDbPayload(input: TenantFormInput) {
  return {
    property_id: input.property_id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    tenancy_start: input.tenancy_start,
    tenancy_end: emptyToNull(input.tenancy_end),
    rent_amount: input.rent_amount,
    rent_frequency: input.rent_frequency,
    deposit_amount: parseOptionalNumber(input.deposit_amount),
    deposit_protected: input.deposit_protected,
    status: input.status,
    notes: emptyToNull(input.notes),
  };
}

export async function getTenantsByProperty(propertyId: string): Promise<Tenant[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getTenantsByProperty:", error);
    return [];
  }
  return (data ?? []) as Tenant[];
}

export async function getAllTenants(): Promise<TenantWithProperty[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select("*, properties(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAllTenants:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const { properties, ...tenant } = row as Tenant & {
      properties: { name: string } | null;
    };
    return {
      ...(tenant as Tenant),
      property_name: properties?.name ?? "Unknown property",
    };
  });
}

export async function createTenant(
  input: TenantFormInput
): Promise<ActionResult<Tenant>> {
  const parsed = tenantFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toTenantDbPayload(parsed.data as TenantFormInput);
  const { data, error } = await supabase
    .from("tenants")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createTenant:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as Tenant };
}

export async function updateTenant(
  id: string,
  input: TenantFormInput
): Promise<ActionResult<Tenant>> {
  const parsed = tenantFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toTenantDbPayload(parsed.data as TenantFormInput);
  const { data, error } = await supabase
    .from("tenants")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateTenant:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as Tenant };
}

export async function deleteTenant(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("tenants")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("tenants")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteTenant:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}

// ─── Maintenance actions ────────────────────────────────────────────────────

const maintenanceFormSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["new", "in_progress", "resolved"]),
  priority: z.enum(["low", "medium", "high", "emergency"]),
  category: z
    .enum(["plumbing", "electrical", "heating", "structural", "appliance", "other"])
    .optional(),
  assigned_to: z.string().optional(),
  estimated_cost: z.coerce.number().min(0).optional(),
  actual_cost: z.coerce.number().min(0).optional(),
  reported_date: z.string().min(1, "Reported date is required"),
  resolved_date: z.string().optional(),
  notes: z.string().optional(),
});

function toMaintenanceDbPayload(input: MaintenanceTicketFormInput) {
  return {
    property_id: input.property_id,
    tenant_id: input.tenant_id ?? null,
    title: input.title.trim(),
    description: emptyToNull(input.description),
    status: input.status,
    priority: input.priority,
    category: input.category ?? null,
    assigned_to: emptyToNull(input.assigned_to),
    estimated_cost: parseOptionalNumber(input.estimated_cost),
    actual_cost: parseOptionalNumber(input.actual_cost),
    reported_date: input.reported_date,
    resolved_date: emptyToNull(input.resolved_date),
    notes: emptyToNull(input.notes),
  };
}

export async function getMaintenanceByProperty(
  propertyId: string
): Promise<MaintenanceTicket[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("reported_date", { ascending: false });
  if (error) {
    console.error("getMaintenanceByProperty:", error);
    return [];
  }
  return (data ?? []) as MaintenanceTicket[];
}

export async function getAllMaintenance(): Promise<MaintenanceTicketWithProperty[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(name)")
    .eq("user_id", userId)
    .order("reported_date", { ascending: false });
  if (error) {
    console.error("getAllMaintenance:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const { properties, ...ticket } = row as MaintenanceTicket & {
      properties: { name: string } | null;
    };
    return {
      ...(ticket as MaintenanceTicket),
      property_name: properties?.name ?? "Unknown property",
    };
  });
}

export async function createMaintenanceTicket(
  input: MaintenanceTicketFormInput
): Promise<ActionResult<MaintenanceTicket>> {
  const parsed = maintenanceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toMaintenanceDbPayload(parsed.data as MaintenanceTicketFormInput);
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createMaintenanceTicket:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as MaintenanceTicket };
}

export async function updateMaintenanceTicket(
  id: string,
  input: MaintenanceTicketFormInput
): Promise<ActionResult<MaintenanceTicket>> {
  const parsed = maintenanceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toMaintenanceDbPayload(parsed.data as MaintenanceTicketFormInput);
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateMaintenanceTicket:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as MaintenanceTicket };
}

export async function deleteMaintenanceTicket(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("maintenance_tickets")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("maintenance_tickets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteMaintenanceTicket:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}

// ─── Rent payment actions ───────────────────────────────────────────────────

const rentPaymentFormSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  amount: z.coerce.number().min(0, "Amount is required"),
  due_date: z.string().min(1, "Due date is required"),
  paid_date: z.string().optional(),
  status: z.enum(["pending", "paid", "late", "partial", "missed"]),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

function toRentPaymentDbPayload(input: RentPaymentFormInput) {
  return {
    property_id: input.property_id,
    tenant_id: input.tenant_id,
    amount: input.amount,
    due_date: input.due_date,
    paid_date: emptyToNull(input.paid_date),
    status: input.status,
    payment_method: emptyToNull(input.payment_method),
    notes: emptyToNull(input.notes),
  };
}

export async function getRentPaymentsByProperty(
  propertyId: string
): Promise<RentPaymentWithDetails[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("rent_payments")
    .select("*, tenants(first_name, last_name)")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("due_date", { ascending: false });
  if (error) {
    console.error("getRentPaymentsByProperty:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const { tenants, ...payment } = row as RentPayment & {
      tenants: { first_name: string; last_name: string } | null;
    };
    return {
      ...(payment as RentPayment),
      tenant_name: tenants
        ? `${tenants.first_name} ${tenants.last_name}`.trim()
        : "Unknown tenant",
    };
  });
}

export async function getAllRentPayments(): Promise<RentPaymentWithDetails[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("rent_payments")
    .select("*, tenants(first_name, last_name), properties(name)")
    .eq("user_id", userId)
    .order("due_date", { ascending: false });
  if (error) {
    console.error("getAllRentPayments:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const { tenants, properties, ...payment } = row as RentPayment & {
      tenants: { first_name: string; last_name: string } | null;
      properties: { name: string } | null;
    };
    return {
      ...(payment as RentPayment),
      tenant_name: tenants
        ? `${tenants.first_name} ${tenants.last_name}`.trim()
        : "Unknown tenant",
      property_name: properties?.name ?? "Unknown property",
    };
  });
}

export async function createRentPayment(
  input: RentPaymentFormInput
): Promise<ActionResult<RentPayment>> {
  const parsed = rentPaymentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toRentPaymentDbPayload(parsed.data as RentPaymentFormInput);
  const { data, error } = await supabase
    .from("rent_payments")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createRentPayment:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as RentPayment };
}

export async function updateRentPayment(
  id: string,
  input: Partial<RentPaymentFormInput>
): Promise<ActionResult<RentPayment>> {
  const parsed = rentPaymentFormSchema.partial().safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const updatePayload: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.property_id !== undefined) updatePayload.property_id = data.property_id;
  if (data.tenant_id !== undefined) updatePayload.tenant_id = data.tenant_id;
  if (data.amount !== undefined) updatePayload.amount = data.amount;
  if (data.due_date !== undefined) updatePayload.due_date = data.due_date;
  if (data.paid_date !== undefined) updatePayload.paid_date = emptyToNull(data.paid_date);
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.payment_method !== undefined) {
    updatePayload.payment_method = emptyToNull(data.payment_method);
  }
  if (data.notes !== undefined) updatePayload.notes = emptyToNull(data.notes);

  const { data: row, error } = await supabase
    .from("rent_payments")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateRentPayment:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths((row as RentPayment).property_id);
  return { success: true, data: row as RentPayment };
}

export async function deleteRentPayment(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("rent_payments")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("rent_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteRentPayment:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}

// ─── Certificate actions ────────────────────────────────────────────────────

const certificateFormSchema = z.object({
  property_id: z.string().uuid(),
  certificate_type: z.enum([
    "gas_safety",
    "epc",
    "eicr",
    "fire_alarm",
    "pat_testing",
    "other",
  ]),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

function toCertificateDbPayload(input: PropertyCertificateFormInput) {
  return {
    property_id: input.property_id,
    certificate_type: input.certificate_type,
    issue_date: emptyToNull(input.issue_date),
    expiry_date: emptyToNull(input.expiry_date),
    notes: emptyToNull(input.notes),
  };
}

export async function getCertificatesByProperty(
  propertyId: string
): Promise<PropertyCertificate[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("expiry_date", { ascending: true });
  if (error) {
    console.error("getCertificatesByProperty:", error);
    return [];
  }
  return (data ?? []) as PropertyCertificate[];
}

export async function createCertificate(
  input: PropertyCertificateFormInput
): Promise<ActionResult<PropertyCertificate>> {
  const parsed = certificateFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toCertificateDbPayload(parsed.data as PropertyCertificateFormInput);
  const { data, error } = await supabase
    .from("property_certificates")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createCertificate:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyCertificate };
}

export async function updateCertificate(
  id: string,
  input: PropertyCertificateFormInput
): Promise<ActionResult<PropertyCertificate>> {
  const parsed = certificateFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toCertificateDbPayload(parsed.data as PropertyCertificateFormInput);
  const { data, error } = await supabase
    .from("property_certificates")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateCertificate:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyCertificate };
}

export async function deleteCertificate(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("property_certificates")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("property_certificates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteCertificate:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}
