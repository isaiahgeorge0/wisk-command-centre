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
  Property,
  PropertyFormInput,
  PropertyWithStats,
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
