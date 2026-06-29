"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { TenantReliabilityBadge } from "@/components/properties/tenant-reliability-badge";
import { TenantStatusBadge } from "@/components/properties/tenant-status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTIES_ACCENT, TENANT_STATUSES } from "@/lib/properties/constants";
import { getTenantStatusDisplayName } from "@/lib/properties/display-names";
import {
  formatPropertyDate,
  formatRentFrequency,
} from "@/lib/properties/format";
import { cn } from "@/lib/utils";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import {
  calculateReliabilityScore,
  type TenantReliabilityScore,
} from "@/lib/properties/reliability";
import type {
  RentPaymentWithDetails,
  TenantStatus,
  TenantWithProperty,
} from "@/lib/properties/types";

type TenantsPageClientProps = {
  tenants: TenantWithProperty[];
  payments: RentPaymentWithDetails[];
  hasProPlan: boolean;
};

export function TenantsPageClient({
  tenants,
  payments,
  hasProPlan,
}: TenantsPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (statusFilter !== "all" && tenant.status !== statusFilter) return false;
      if (!query) return true;
      const name = getTenantFullName(tenant).toLowerCase();
      const email = tenant.email?.toLowerCase() ?? "";
      return name.includes(query) || email.includes(query);
    });
  }, [tenants, search, statusFilter]);

  const scoresByTenantId = useMemo(() => {
    if (!hasProPlan) return new Map<string, TenantReliabilityScore>();
    const map = new Map<string, TenantReliabilityScore>();
    for (const tenant of tenants) {
      const tenantPayments = payments.filter(
        (payment) => payment.tenant_id === tenant.id
      );
      map.set(tenant.id, calculateReliabilityScore(tenant.id, tenantPayments));
    }
    return map;
  }, [tenants, payments, hasProPlan]);

  return (
    <PageTransition>
      <PageHeader
        title="Tenants"
        subtitle="Tenant records, tenancies, and deposits across your portfolio."
        icon={<Users className="size-6" style={{ color: PROPERTIES_ACCENT }} />}
        className="mb-8"
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="min-h-11"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v as TenantStatus | "all")}
        >
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {statusFilter === "all"
                ? "All statuses"
                : getTenantStatusDisplayName(statusFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TENANT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getTenantStatusDisplayName(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">No tenants yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add tenants from a property detail page.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
          <div
            className={cn(
              "hidden gap-4 border-b border-border/50 px-4 py-3 text-xs font-medium text-muted-foreground md:grid",
              hasProPlan ? "grid-cols-7" : "grid-cols-6"
            )}
          >
            <span>Tenant</span>
            <span>Property</span>
            <span>Contact</span>
            <span>Tenancy</span>
            <span>Rent</span>
            <span>Status</span>
            {hasProPlan ? <span>Reliability</span> : null}
          </div>
          <div className="divide-y divide-border/50">
            {filtered.map((tenant) => {
              const score = scoresByTenantId.get(tenant.id);
              return (
              <Link
                key={tenant.id}
                href={`/properties/${tenant.property_id}?tab=tenants`}
                className={cn(
                  "grid gap-3 px-4 py-4 transition-colors hover:bg-muted/30 md:items-center md:gap-4",
                  hasProPlan ? "md:grid-cols-7" : "md:grid-cols-6"
                )}
              >
                <p className="font-medium text-foreground">
                  {getTenantFullName(tenant)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tenant.property_name}
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>{tenant.email ?? "—"}</p>
                  <p>{tenant.phone ?? "—"}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPropertyDate(tenant.tenancy_start)}
                  {tenant.tenancy_end
                    ? ` → ${formatPropertyDate(tenant.tenancy_end)}`
                    : " → ongoing"}
                </p>
                <p className="text-sm text-foreground">
                  {formatRentFrequency(tenant.rent_amount, tenant.rent_frequency)}
                </p>
                <TenantStatusBadge status={tenant.status} />
                {hasProPlan && score ? (
                  <TenantReliabilityBadge score={score} size="sm" />
                ) : null}
              </Link>
              );
            })}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
