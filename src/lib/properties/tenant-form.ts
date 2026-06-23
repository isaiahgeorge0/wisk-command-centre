import type { Tenant, TenantFormInput } from "@/lib/properties/types";

export const EMPTY_TENANT_FORM = (
  propertyId: string
): TenantFormInput => ({
  property_id: propertyId,
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  tenancy_start: new Date().toISOString().slice(0, 10),
  tenancy_end: "",
  rent_amount: 0,
  rent_frequency: "monthly",
  deposit_amount: undefined,
  deposit_protected: false,
  status: "active",
  notes: "",
});

export function tenantToFormInput(tenant: Tenant): TenantFormInput {
  return {
    property_id: tenant.property_id,
    first_name: tenant.first_name,
    last_name: tenant.last_name,
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
    tenancy_start: tenant.tenancy_start,
    tenancy_end: tenant.tenancy_end ?? "",
    rent_amount: tenant.rent_amount,
    rent_frequency: tenant.rent_frequency,
    deposit_amount: tenant.deposit_amount ?? undefined,
    deposit_protected: tenant.deposit_protected,
    status: tenant.status,
    notes: tenant.notes ?? "",
  };
}

export function getTenantFullName(tenant: Pick<Tenant, "first_name" | "last_name">) {
  return `${tenant.first_name} ${tenant.last_name}`.trim();
}
