import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { createClient } from "@/lib/supabase/server";
import type { Property, Tenant } from "@/lib/properties/types";

export type TenantContext = {
  tenant: Tenant;
  property: Property;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const { user } = await getAuthContext();
    const supabase = await createClient();

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("portal_user_id", user.id)
      .eq("portal_enabled", true)
      .maybeSingle();

    if (tenantError || !tenant) {
      return null;
    }

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", tenant.property_id)
      .maybeSingle();

    if (propertyError || !property) {
      return null;
    }

    return {
      tenant: tenant as Tenant,
      property: property as Property,
    };
  } catch {
    return null;
  }
}

export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) {
    redirect("/portal/login");
  }
  return context;
}
