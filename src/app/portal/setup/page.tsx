import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalSetupForm } from "@/components/portal/portal-setup-form";
import { formatPropertyAddress } from "@/lib/properties/format";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type { Property, Tenant } from "@/lib/properties/types";
import { createAdminClient } from "@/lib/supabase/admin";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

type SetupPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function PortalSetupPage({ searchParams }: SetupPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ExpiredInvite />;
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select(
      "*, properties(address_line1, address_line2, city, postcode)"
    )
    .eq("portal_invite_token", token)
    .maybeSingle();

  if (!tenant) {
    return <ExpiredInvite />;
  }

  if (tenant.portal_user_id) {
    redirect("/portal/login");
  }

  const invitedAt = tenant.portal_invited_at
    ? new Date(tenant.portal_invited_at as string).getTime()
    : null;

  if (!invitedAt || Date.now() - invitedAt > INVITE_EXPIRY_MS) {
    return <ExpiredInvite />;
  }

  const property = tenant.properties as Pick<
    Property,
    "address_line1" | "address_line2" | "city" | "postcode"
  > | null;

  const propertyAddress = property
    ? formatPropertyAddress(property)
    : "your property";

  return (
    <PortalSetupForm
      token={token}
      email={tenant.email?.trim() ?? ""}
      tenantName={getTenantFullName(tenant as Tenant)}
      propertyAddress={propertyAddress}
    />
  );
}

function ExpiredInvite() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-amber-500 uppercase">
        WISK Tenant Portal
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        This link has expired
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Please contact your landlord to request a new invitation.
      </p>
      <Link
        href="/portal/login"
        className="mt-6 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
      >
        Go to sign in
      </Link>
    </div>
  );
}
