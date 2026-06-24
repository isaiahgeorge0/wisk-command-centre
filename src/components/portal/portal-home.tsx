import Link from "next/link";
import { Check, FileText, Wrench, X } from "lucide-react";

import { PortalPage } from "@/components/portal/portal-page";
import {
  formatPropertyAddress,
  formatPropertyCurrency,
  formatPropertyDate,
  formatRentFrequency,
} from "@/lib/properties/format";
import { getPropertyTypeDisplayName } from "@/lib/properties/display-names";
import type {
  MaintenanceTicket,
  Property,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PortalHomeProps = {
  tenant: Tenant;
  property: Property;
  tickets: MaintenanceTicket[];
  landlordName: string | null;
};

function statusDotClass(status: MaintenanceTicket["status"]): string {
  switch (status) {
    case "new":
      return "bg-[var(--portal-amber)]";
    case "in_progress":
      return "bg-sky-500";
    case "resolved":
      return "bg-[var(--portal-success)]";
    default:
      return "bg-[var(--portal-muted)]";
  }
}

export function PortalHome({
  tenant,
  property,
  tickets,
  landlordName,
}: PortalHomeProps) {
  const openTickets = tickets.filter((t) => t.status !== "resolved");
  const newCount = openTickets.filter((t) => t.status === "new").length;
  const inProgressCount = openTickets.filter(
    (t) => t.status === "in_progress"
  ).length;
  const address = formatPropertyAddress(property);

  return (
    <PortalPage>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-[var(--portal-border)] bg-gradient-to-br from-[var(--portal-amber-gradient-from)] to-[var(--portal-card)] p-6 shadow-[var(--portal-shadow)]">
          <div className="absolute inset-y-0 left-0 w-1 bg-[var(--portal-amber)]" />
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[var(--portal-text)]">
            {address}
          </h1>
          <span className="mt-3 inline-flex rounded-full bg-[var(--portal-amber-light)] px-3 py-1 text-xs font-medium text-[var(--portal-amber)]">
            {getPropertyTypeDisplayName(property.property_type)}
          </span>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] shadow-[var(--portal-shadow)]">
          <div className="border-b border-[var(--portal-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--portal-text)]">
              Tenancy details
            </h2>
          </div>
          <dl className="divide-y divide-[var(--portal-border)]">
            <DetailRow
              label="Start date"
              value={formatPropertyDate(tenant.tenancy_start)}
            />
            <DetailRow
              label="End date"
              value={
                tenant.tenancy_end
                  ? formatPropertyDate(tenant.tenancy_end)
                  : "Ongoing"
              }
            />
            <DetailRow
              label="Rent"
              value={formatRentFrequency(
                tenant.rent_amount,
                tenant.rent_frequency
              )}
            />
            <DetailRow
              label="Deposit"
              value={
                tenant.deposit_amount != null
                  ? formatPropertyCurrency(tenant.deposit_amount)
                  : "—"
              }
              trailing={
                tenant.deposit_amount != null ? (
                  tenant.deposit_protected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-[var(--portal-success)]">
                      <Check className="size-3" />
                      Protected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-[var(--portal-error)]">
                      <X className="size-3" />
                      Unprotected
                    </span>
                  )
                ) : null
              }
            />
          </dl>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/portal/maintenance?new=1"
            className="flex min-h-20 flex-col items-start justify-between rounded-2xl bg-[var(--portal-amber)] p-4 text-white shadow-[var(--portal-shadow)] transition-transform active:scale-[0.98]"
          >
            <Wrench className="size-6" />
            <span className="text-sm font-semibold leading-snug">
              Submit request
            </span>
          </Link>
          <Link
            href="/portal/documents"
            className="flex min-h-20 flex-col items-start justify-between rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-4 shadow-[var(--portal-shadow)] transition-transform active:scale-[0.98]"
          >
            <FileText className="size-6 text-[var(--portal-amber)]" />
            <span className="text-sm font-semibold leading-snug text-[var(--portal-text)]">
              View documents
            </span>
          </Link>
        </section>

        {openTickets.length > 0 ? (
          <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--portal-text)]">
                Maintenance
              </h2>
              <Link
                href="/portal/maintenance"
                className="text-sm font-medium text-[var(--portal-amber)]"
              >
                View all
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {newCount > 0 ? (
                <StatusRow
                  label="New"
                  count={newCount}
                  dotClass={statusDotClass("new")}
                />
              ) : null}
              {inProgressCount > 0 ? (
                <StatusRow
                  label="In progress"
                  count={inProgressCount}
                  dotClass={statusDotClass("in_progress")}
                />
              ) : null}
            </ul>
          </section>
        ) : null}

        {landlordName ? (
          <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 text-sm text-[var(--portal-muted)] shadow-[var(--portal-shadow)]">
            Questions? Contact your landlord,{" "}
            <span className="font-medium text-[var(--portal-text)]">
              {landlordName}
            </span>
            .
          </section>
        ) : null}
      </div>
    </PortalPage>
  );
}

function DetailRow({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
      <dt className="text-[var(--portal-muted)]">{label}</dt>
      <dd className="flex items-center gap-2 text-right font-medium text-[var(--portal-text)]">
        {value}
        {trailing}
      </dd>
    </div>
  );
}

function StatusRow({
  label,
  count,
  dotClass,
}: {
  label: string;
  count: number;
  dotClass: string;
}) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-[var(--portal-muted)]">
        <span className={cn("size-2 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="font-medium tabular-nums text-[var(--portal-text)]">
        {count}
      </span>
    </li>
  );
}
