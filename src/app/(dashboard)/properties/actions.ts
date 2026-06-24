"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/is-admin";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { logUsage } from "@/lib/ai/usage-logger";
import {
  portalAppUrl,
  sendTenantPortalInviteEmail,
} from "@/lib/properties/emails";
import { formatPropertyAddress } from "@/lib/properties/format";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPropertyPortfolioContext,
  generatePropertyInsights,
  startOfMonthUtc,
  startOfWeekUtc,
} from "@/lib/properties/insights-generator";
import {
  emptyToNull,
  parseOptionalNumber,
} from "@/lib/properties/format";
import type {
  ActionResult,
  CertificateAlertLog,
  MaintenanceTicket,
  MaintenanceTicketFormInput,
  MaintenanceTicketWithProperty,
  Property,
  PropertyCertificate,
  PropertyCertificateFormInput,
  PropertyDocument,
  PropertyFormInput,
  PropertyInsurance,
  PropertyInsuranceFormInput,
  PropertyInsight,
  PropertyMortgage,
  PropertyMortgageFormInput,
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

// ─── Mortgage actions ───────────────────────────────────────────────────────

const mortgageFormSchema = z.object({
  property_id: z.string().uuid(),
  lender: z.string().trim().min(1, "Lender is required"),
  account_reference: z.string().optional(),
  monthly_payment: z.coerce.number().min(0, "Monthly payment is required"),
  interest_rate: z.coerce.number().min(0).optional(),
  mortgage_type: z.enum(["repayment", "interest_only"]),
  fixed_rate_end_date: z.string().optional(),
  mortgage_end_date: z.string().optional(),
  outstanding_balance: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  alerts_enabled: z.boolean(),
});

function toMortgageDbPayload(input: PropertyMortgageFormInput) {
  return {
    property_id: input.property_id,
    lender: input.lender.trim(),
    account_reference: emptyToNull(input.account_reference),
    monthly_payment: input.monthly_payment,
    interest_rate: parseOptionalNumber(input.interest_rate),
    mortgage_type: input.mortgage_type,
    fixed_rate_end_date: emptyToNull(input.fixed_rate_end_date),
    mortgage_end_date: emptyToNull(input.mortgage_end_date),
    outstanding_balance: parseOptionalNumber(input.outstanding_balance),
    notes: emptyToNull(input.notes),
    alerts_enabled: input.alerts_enabled,
  };
}

export async function getMortgagesByProperty(
  propertyId: string
): Promise<PropertyMortgage[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_mortgages")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMortgagesByProperty:", error);
    return [];
  }
  return (data ?? []) as PropertyMortgage[];
}

export async function getAllMortgages(): Promise<PropertyMortgage[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_mortgages")
    .select("*")
    .eq("user_id", userId)
    .order("fixed_rate_end_date", { ascending: true });
  if (error) {
    console.error("getAllMortgages:", error);
    return [];
  }
  return (data ?? []) as PropertyMortgage[];
}

export async function createMortgage(
  input: PropertyMortgageFormInput
): Promise<ActionResult<PropertyMortgage>> {
  const parsed = mortgageFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toMortgageDbPayload(parsed.data as PropertyMortgageFormInput);
  const { data, error } = await supabase
    .from("property_mortgages")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createMortgage:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyMortgage };
}

export async function updateMortgage(
  id: string,
  input: PropertyMortgageFormInput
): Promise<ActionResult<PropertyMortgage>> {
  const parsed = mortgageFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toMortgageDbPayload(parsed.data as PropertyMortgageFormInput);
  const { data, error } = await supabase
    .from("property_mortgages")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateMortgage:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyMortgage };
}

export async function deleteMortgage(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("property_mortgages")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("property_mortgages")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteMortgage:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}

export async function acknowledgeMortgageAlert(
  alertId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("mortgage_alert_log")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("user_id", userId)
    .select("property_id")
    .single();
  if (error) {
    console.error("acknowledgeMortgageAlert:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(data?.property_id as string);
  return { success: true };
}

export async function toggleMortgageAlerts(
  mortgageId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_mortgages")
    .update({ alerts_enabled: enabled })
    .eq("id", mortgageId)
    .eq("user_id", userId)
    .select("property_id")
    .single();
  if (error) {
    console.error("toggleMortgageAlerts:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(data?.property_id as string);
  return { success: true };
}

// ─── Insurance actions ──────────────────────────────────────────────────────

const insuranceFormSchema = z.object({
  property_id: z.string().uuid(),
  insurer: z.string().trim().min(1, "Insurer is required"),
  policy_number: z.string().optional(),
  insurance_type: z.enum([
    "buildings",
    "contents",
    "landlord_liability",
    "combined",
    "other",
  ]),
  annual_premium: z.coerce.number().min(0).optional(),
  renewal_date: z.string().optional(),
  start_date: z.string().optional(),
  notes: z.string().optional(),
  alerts_enabled: z.boolean(),
});

function toInsuranceDbPayload(input: PropertyInsuranceFormInput) {
  return {
    property_id: input.property_id,
    insurer: input.insurer.trim(),
    policy_number: emptyToNull(input.policy_number),
    insurance_type: input.insurance_type,
    annual_premium: parseOptionalNumber(input.annual_premium),
    renewal_date: emptyToNull(input.renewal_date),
    start_date: emptyToNull(input.start_date),
    notes: emptyToNull(input.notes),
    alerts_enabled: input.alerts_enabled,
  };
}

export async function getInsuranceByProperty(
  propertyId: string
): Promise<PropertyInsurance[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_insurance")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("renewal_date", { ascending: true });
  if (error) {
    console.error("getInsuranceByProperty:", error);
    return [];
  }
  return (data ?? []) as PropertyInsurance[];
}

export async function getAllInsurance(): Promise<PropertyInsurance[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_insurance")
    .select("*")
    .eq("user_id", userId)
    .order("renewal_date", { ascending: true });
  if (error) {
    console.error("getAllInsurance:", error);
    return [];
  }
  return (data ?? []) as PropertyInsurance[];
}

export async function createInsurance(
  input: PropertyInsuranceFormInput
): Promise<ActionResult<PropertyInsurance>> {
  const parsed = insuranceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toInsuranceDbPayload(parsed.data as PropertyInsuranceFormInput);
  const { data, error } = await supabase
    .from("property_insurance")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) {
    console.error("createInsurance:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyInsurance };
}

export async function updateInsurance(
  id: string,
  input: PropertyInsuranceFormInput
): Promise<ActionResult<PropertyInsurance>> {
  const parsed = insuranceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { supabase, userId } = await getScopedSupabase();
  const payload = toInsuranceDbPayload(parsed.data as PropertyInsuranceFormInput);
  const { data, error } = await supabase
    .from("property_insurance")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("updateInsurance:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: data as PropertyInsurance };
}

export async function deleteInsurance(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("property_insurance")
    .select("property_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase
    .from("property_insurance")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("deleteInsurance:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(existing?.property_id);
  return { success: true };
}

export async function acknowledgeInsuranceAlert(
  alertId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("insurance_alert_log")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("user_id", userId)
    .select("property_id")
    .single();
  if (error) {
    console.error("acknowledgeInsuranceAlert:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(data?.property_id as string);
  return { success: true };
}

export async function toggleInsuranceAlerts(
  insuranceId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_insurance")
    .update({ alerts_enabled: enabled })
    .eq("id", insuranceId)
    .eq("user_id", userId)
    .select("property_id")
    .single();
  if (error) {
    console.error("toggleInsuranceAlerts:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(data?.property_id as string);
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
  input: PropertyCertificateFormInput,
  documentId?: string
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

  const certificate = data as PropertyCertificate;

  if (documentId) {
    const linkResult = await linkDocumentToCertificate(
      documentId,
      certificate.id
    );
    if (!linkResult.success) {
      return { success: false, error: linkResult.error };
    }
  }

  revalidatePropertyPaths(payload.property_id);
  return { success: true, data: certificate };
}

export async function updateCertificate(
  id: string,
  input: PropertyCertificateFormInput,
  documentId?: string | null
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

  if (documentId) {
    const linkResult = await linkDocumentToCertificate(documentId, id);
    if (!linkResult.success) {
      return { success: false, error: linkResult.error };
    }
  } else if (documentId === null) {
    const { error: unlinkError } = await supabase
      .from("property_documents")
      .update({ certificate_id: null })
      .eq("certificate_id", id)
      .eq("user_id", userId);
    if (unlinkError) {
      console.error("updateCertificate unlink:", unlinkError);
      return { success: false, error: unlinkError.message };
    }
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

// ─── Certificate alerts ─────────────────────────────────────────────────────

export async function togglePropertyAlerts(
  propertyId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { error } = await supabase
    .from("properties")
    .update({ alerts_enabled: enabled })
    .eq("id", propertyId)
    .eq("user_id", userId);
  if (error) {
    console.error("togglePropertyAlerts:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(propertyId);
  return { success: true };
}

export async function acknowledgeCertificateAlert(
  alertId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("certificate_alert_log")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("user_id", userId)
    .select("property_id")
    .single();
  if (error) {
    console.error("acknowledgeCertificateAlert:", error);
    return { success: false, error: error.message };
  }
  revalidatePropertyPaths(data?.property_id as string);
  return { success: true };
}

export async function getCertificateAlertsByProperty(
  propertyId: string
): Promise<CertificateAlertLog[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("certificate_alert_log")
    .select("*")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("sent_at", { ascending: false });
  if (error) {
    console.error("getCertificateAlertsByProperty:", error);
    return [];
  }
  return (data ?? []) as CertificateAlertLog[];
}

// ─── Documents ──────────────────────────────────────────────────────────────

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const documentTypeSchema = z.enum([
  "lease",
  "certificate",
  "inspection",
  "correspondence",
  "other",
]);

export async function getDocumentsByProperty(
  propertyId: string
): Promise<PropertyDocument[]> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_documents")
    .select(
      "*, property_certificates(certificate_type, expiry_date)"
    )
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getDocumentsByProperty:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const { property_certificates, ...document } = row as PropertyDocument & {
      property_certificates: {
        certificate_type: string;
        expiry_date: string | null;
      } | null;
    };
    return {
      ...(document as PropertyDocument),
      certificate_type:
        (property_certificates?.certificate_type as PropertyDocument["certificate_type"]) ??
        null,
      certificate_expiry: property_certificates?.expiry_date ?? null,
    };
  });
}

export async function linkDocumentToCertificate(
  documentId: string,
  certificateId: string | null
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: document, error: fetchError } = await supabase
    .from("property_documents")
    .select("property_id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !document) {
    return { success: false, error: "Document not found" };
  }

  if (certificateId) {
    const { data: certificate, error: certError } = await supabase
      .from("property_certificates")
      .select("id")
      .eq("id", certificateId)
      .eq("user_id", userId)
      .eq("property_id", document.property_id)
      .maybeSingle();

    if (certError || !certificate) {
      return { success: false, error: "Certificate not found" };
    }
  }

  const { error } = await supabase
    .from("property_documents")
    .update({ certificate_id: certificateId })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    console.error("linkDocumentToCertificate:", error);
    return { success: false, error: error.message };
  }

  revalidatePropertyPaths(document.property_id as string);
  return { success: true };
}

export async function uploadPropertyDocument(
  propertyId: string,
  file: File,
  documentType: string,
  name: string,
  certificateId?: string
): Promise<ActionResult<PropertyDocument>> {
  const parsedType = documentTypeSchema.safeParse(documentType);
  if (!parsedType.success) {
    return { success: false, error: "Invalid document type" };
  }
  if (!name.trim()) {
    return { success: false, error: "Document name is required" };
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return {
      success: false,
      error: "Invalid file type. Allowed: PDF, JPEG, PNG, WebP, HEIC",
    };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { success: false, error: "File exceeds 10MB limit" };
  }

  const { supabase, userId } = await getScopedSupabase();
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${propertyId}/${parsedType.data}/${Date.now()}_${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from("property-documents")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("uploadPropertyDocument:", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("property_documents")
    .insert({
      user_id: userId,
      property_id: propertyId,
      name: name.trim(),
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      document_type: parsedType.data,
      certificate_id: certificateId ?? null,
    })
    .select(
      "*, property_certificates(certificate_type, expiry_date)"
    )
    .single();

  if (error) {
    console.error("uploadPropertyDocument insert:", error);
    await supabase.storage.from("property-documents").remove([filePath]);
    return { success: false, error: error.message };
  }

  const { property_certificates, ...document } = data as PropertyDocument & {
    property_certificates: {
      certificate_type: string;
      expiry_date: string | null;
    } | null;
  };

  revalidatePropertyPaths(propertyId);
  return {
    success: true,
    data: {
      ...(document as PropertyDocument),
      certificate_type:
        (property_certificates?.certificate_type as PropertyDocument["certificate_type"]) ??
        null,
      certificate_expiry: property_certificates?.expiry_date ?? null,
    },
  };
}

export async function getDocumentUrl(filePath: string): Promise<string | null> {
  const { supabase, userId } = await getScopedSupabase();
  if (!filePath.startsWith(`${userId}/`)) {
    return null;
  }
  const { data, error } = await supabase.storage
    .from("property-documents")
    .createSignedUrl(filePath, 3600);
  if (error) {
    console.error("getDocumentUrl:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deletePropertyDocument(
  documentId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();
  const { data: existing } = await supabase
    .from("property_documents")
    .select("property_id, file_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Document not found" };
  }

  await supabase.storage
    .from("property-documents")
    .remove([existing.file_path as string]);

  const { error } = await supabase
    .from("property_documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    console.error("deletePropertyDocument:", error);
    return { success: false, error: error.message };
  }

  revalidatePropertyPaths(existing.property_id as string);
  return { success: true };
}

export async function toggleDocumentTenantSharing(
  documentId: string,
  shared: boolean
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("property_documents")
    .update({ shared_with_tenant: shared })
    .eq("id", documentId)
    .eq("user_id", userId)
    .select("property_id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Document not found",
    };
  }

  revalidatePropertyPaths(data.property_id as string);
  return { success: true };
}

// ─── Tenant portal (landlord) ───────────────────────────────────────────────

export async function inviteTenantToPortal(
  tenantId: string
): Promise<ActionResult<{ message?: string }>> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*, properties(name, address_line1, address_line2, city, postcode)")
    .eq("id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { success: false, error: "Tenant not found" };
  }

  if (!tenant.email?.trim()) {
    return { success: false, error: "Tenant must have an email address" };
  }

  if (tenant.portal_enabled) {
    return {
      success: true,
      data: {
        message: tenant.portal_user_id
          ? "This tenant already has portal access."
          : "An invite has already been sent. Awaiting setup.",
      },
    };
  }

  const token = randomUUID();
  const invitedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("tenants")
    .update({
      portal_enabled: true,
      portal_invite_token: token,
      portal_invited_at: invitedAt,
    })
    .eq("id", tenantId)
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const property = tenant.properties as {
    name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postcode: string;
  } | null;

  const [{ data: prefs }, { data: landlordUser }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("users").select("name, email").eq("id", userId).maybeSingle(),
  ]);

  const landlordName =
    prefs?.display_name?.trim() ||
    landlordUser?.name?.trim() ||
    landlordUser?.email?.split("@")[0] ||
    "Your landlord";

  const propertyAddress = property
    ? formatPropertyAddress(property)
    : "your property";

  const setupUrl = portalAppUrl(`/portal/setup?token=${token}`);

  const sent = await sendTenantPortalInviteEmail({
    to: tenant.email.trim(),
    tenantName: getTenantFullName(tenant as Tenant),
    propertyAddress,
    landlordName,
    setupUrl,
  });

  if (!sent) {
    return {
      success: false,
      error: "Invite saved but email could not be sent. Try again later.",
    };
  }

  revalidatePropertyPaths(tenant.property_id as string);
  return { success: true };
}

export async function revokeTenantPortalAccess(
  tenantId: string
): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("property_id, portal_user_id")
    .eq("id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { success: false, error: "Tenant not found" };
  }

  if (tenant.portal_user_id) {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(
      tenant.portal_user_id as string
    );
    if (deleteError) {
      console.error("revokeTenantPortalAccess deleteUser:", deleteError);
      return { success: false, error: "Could not revoke portal access" };
    }
  }

  const { error: updateError } = await supabase
    .from("tenants")
    .update({
      portal_enabled: false,
      portal_user_id: null,
      portal_invite_token: null,
      portal_invited_at: null,
    })
    .eq("id", tenantId)
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePropertyPaths(tenant.property_id as string);
  return { success: true };
}

// ─── Property insights ──────────────────────────────────────────────────────

export async function getLatestPropertyInsight(): Promise<PropertyInsight | null> {
  const { supabase, userId } = await getScopedSupabase();
  const { data, error } = await supabase
    .from("property_insights")
    .select("*")
    .eq("user_id", userId)
    .in("insight_type", ["weekly_digest", "monthly_digest"])
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getLatestPropertyInsight:", error);
    return null;
  }
  return data as PropertyInsight | null;
}

export async function triggerPropertyInsightsGeneration(): Promise<ActionResult> {
  const { supabase, userId } = await getScopedSupabase();

  const { data: authUser } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(authUser.user?.email);

  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const propertyCount = count ?? 0;
  if (propertyCount === 0) {
    return { success: false, error: "Add a property before generating insights" };
  }

  const insightType = propertyCount >= 3 ? "weekly_digest" : "monthly_digest";
  const now = new Date();
  const periodStart =
    insightType === "weekly_digest"
      ? startOfWeekUtc(now).toISOString()
      : startOfMonthUtc(now).toISOString();

  if (!isAdmin) {
    const { data: existing } = await supabase
      .from("property_insights")
      .select("generated_at")
      .eq("user_id", userId)
      .eq("insight_type", insightType)
      .gte("generated_at", periodStart)
      .limit(1);

    if (existing?.length) {
      return {
        success: false,
        error: "Insights already generated for this period",
      };
    }

    const { data: latest } = await supabase
      .from("property_insights")
      .select("generated_at")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.generated_at) {
      const minWaitMs =
        insightType === "weekly_digest"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - new Date(latest.generated_at as string).getTime();
      if (elapsed < minWaitMs) {
        return {
          success: false,
          error: "Please wait before generating again",
        };
      }
    }
  }

  try {
    const context = await buildPropertyPortfolioContext(userId, supabase);
    const { content, inputTokens, outputTokens } =
      await generatePropertyInsights(context);

    const { error } = await supabase.from("property_insights").insert({
      user_id: userId,
      insight_type: insightType,
      content,
      period_start: context.periodStart,
      period_end: context.periodEnd,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await logUsage(userId, "property_insights", inputTokens, outputTokens);
    revalidatePath("/properties/winston");
    revalidatePath("/properties/dashboard");
    return { success: true };
  } catch (err) {
    console.error("triggerPropertyInsightsGeneration:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    };
  }
}
