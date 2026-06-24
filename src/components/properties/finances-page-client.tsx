"use client";

import { PoundSterling } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { RentPaymentStatusBadge } from "@/components/properties/rent-payment-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPERTIES_ACCENT,
  RENT_PAYMENT_STATUSES,
} from "@/lib/properties/constants";
import {
  getInsuranceTypeDisplayName,
  getRentPaymentStatusDisplayName,
} from "@/lib/properties/display-names";
import {
  daysUntilDate,
  daysUntilExpiryClass,
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import {
  buildPortfolioFinanceStats,
  filterPaymentsByMonth,
  filterPaymentsByStatus,
  groupPaymentsByProperty,
} from "@/lib/properties/selectors";
import type {
  PropertyInsurance,
  PropertyMortgage,
  PropertyWithStats,
  RentPaymentStatus,
  RentPaymentWithDetails,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type FinancesPageClientProps = {
  properties: PropertyWithStats[];
  payments: RentPaymentWithDetails[];
  tenants: Tenant[];
  mortgages: PropertyMortgage[];
  insurance: PropertyInsurance[];
};

type UpcomingRenewal = {
  id: string;
  propertyId: string;
  propertyName: string;
  label: string;
  date: string;
  daysUntil: number;
  kind: "mortgage" | "insurance";
};

export function FinancesPageClient({
  properties,
  payments,
  tenants,
  mortgages,
  insurance,
}: FinancesPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<RentPaymentStatus | "all">(
    "all"
  );
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const propertyNameById = useMemo(
    () => new Map(properties.map((p) => [p.id, p.name])),
    [properties]
  );

  const monthOptions = useMemo(() => {
    const keys = new Set(
      payments.map((payment) => payment.due_date.slice(0, 7))
    );
    return Array.from(keys).sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    let result = filterPaymentsByStatus(payments, statusFilter);
    result = filterPaymentsByMonth(result, monthFilter);
    return result;
  }, [payments, statusFilter, monthFilter]);

  const grouped = useMemo(
    () => groupPaymentsByProperty(filtered),
    [filtered]
  );

  const stats = useMemo(
    () => buildPortfolioFinanceStats(properties, payments, tenants),
    [properties, payments, tenants]
  );

  const totalMonthlyMortgage = useMemo(
    () => mortgages.reduce((sum, m) => sum + m.monthly_payment, 0),
    [mortgages]
  );

  const totalAnnualInsurance = useMemo(
    () =>
      insurance.reduce((sum, record) => sum + (record.annual_premium ?? 0), 0),
    [insurance]
  );

  const upcomingRenewals = useMemo(() => {
    const items: UpcomingRenewal[] = [];

    for (const mortgage of mortgages) {
      if (!mortgage.fixed_rate_end_date) continue;
      const days = daysUntilDate(mortgage.fixed_rate_end_date);
      if (days == null || days < 0 || days > 90) continue;
      items.push({
        id: mortgage.id,
        propertyId: mortgage.property_id,
        propertyName: propertyNameById.get(mortgage.property_id) ?? "Property",
        label: `${mortgage.lender} fixed rate ends`,
        date: mortgage.fixed_rate_end_date,
        daysUntil: days,
        kind: "mortgage",
      });
    }

    for (const record of insurance) {
      if (!record.renewal_date) continue;
      const days = daysUntilDate(record.renewal_date);
      if (days == null || days < 0 || days > 90) continue;
      items.push({
        id: record.id,
        propertyId: record.property_id,
        propertyName: propertyNameById.get(record.property_id) ?? "Property",
        label: `${getInsuranceTypeDisplayName(record.insurance_type)} insurance renews`,
        date: record.renewal_date,
        daysUntil: days,
        kind: "insurance",
      });
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [insurance, mortgages, propertyNameById]);

  return (
    <PageTransition>
      <PageHeader
        title="Finances"
        subtitle="Rent payments, mortgages, insurance, and financial tracking."
        icon={
          <PoundSterling className="size-6" style={{ color: PROPERTIES_ACCENT }} />
        }
        className="mb-8"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Monthly expected"
          value={formatPropertyCurrency(stats.totalMonthlyExpected)}
        />
        <StatTile
          label="Received this month"
          value={formatPropertyCurrency(stats.totalReceivedThisMonth)}
        />
        <StatTile
          label="Outstanding"
          value={formatPropertyCurrency(stats.totalOutstanding)}
        />
        <StatTile
          label="Occupancy rate"
          value={`${stats.occupancyRate}%`}
        />
      </div>

      <section className="mb-8 space-y-4 rounded-xl border border-amber-500/15 bg-card/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">Portfolio summary</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Total monthly mortgage payments"
            value={formatPropertyCurrency(totalMonthlyMortgage)}
          />
          <StatTile
            label="Total annual insurance premiums"
            value={formatPropertyCurrency(totalAnnualInsurance)}
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Upcoming in the next 90 days
          </h3>
          {upcomingRenewals.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No fixed rate ends or insurance renewals due soon.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcomingRenewals.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={`/properties/${item.propertyId}?tab=finances`}
                    className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/60 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.propertyName} · {formatPropertyDate(item.date)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        daysUntilExpiryClass(item.daysUntil)
                      )}
                    >
                      {item.daysUntil} days
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            v && setStatusFilter(v as RentPaymentStatus | "all")
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {statusFilter === "all"
                ? "All statuses"
                : getRentPaymentStatusDisplayName(statusFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RENT_PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getRentPaymentStatusDisplayName(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={(v) => v && setMonthFilter(v)}>
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">
            No rent payments recorded
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Payments will appear here once added from property detail pages.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([propertyId, group]) => (
            <section key={propertyId}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {group.propertyName}
              </h2>
              <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/40">
                {group.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {payment.tenant_name}
                        </p>
                        <RentPaymentStatusBadge status={payment.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Due {formatPropertyDate(payment.due_date)} ·{" "}
                        {formatPropertyCurrency(payment.amount)}
                        {payment.paid_date
                          ? ` · Paid ${formatPropertyDate(payment.paid_date)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
