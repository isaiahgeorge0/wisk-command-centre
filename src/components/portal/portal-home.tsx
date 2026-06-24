import Link from "next/link";
import { FileText, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatPropertyAddress,
  formatPropertyCurrency,
  formatPropertyDate,
  formatRentFrequency,
} from "@/lib/properties/format";
import {
  getPropertyTypeDisplayName,
} from "@/lib/properties/display-names";
import type {
  MaintenanceTicket,
  Property,
  Tenant,
} from "@/lib/properties/types";

type PortalHomeProps = {
  tenant: Tenant;
  property: Property;
  tickets: MaintenanceTicket[];
  landlordName: string | null;
};

export function PortalHome({
  tenant,
  property,
  tickets,
  landlordName,
}: PortalHomeProps) {
  const openCount = tickets.filter((t) => t.status !== "resolved").length;
  const newCount = tickets.filter((t) => t.status === "new").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-card p-5">
        <p className="text-xs font-medium tracking-wide text-amber-700 uppercase dark:text-amber-300">
          Your home
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">
          {property.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatPropertyAddress(property)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {getPropertyTypeDisplayName(property.property_type)}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
        <h2 className="text-sm font-semibold text-foreground">Tenancy details</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Start date</dt>
            <dd className="text-right text-foreground">
              {formatPropertyDate(tenant.tenancy_start)}
            </dd>
          </div>
          {tenant.tenancy_end ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">End date</dt>
              <dd className="text-right text-foreground">
                {formatPropertyDate(tenant.tenancy_end)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Rent</dt>
            <dd className="text-right text-foreground">
              {formatRentFrequency(tenant.rent_amount, tenant.rent_frequency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Deposit</dt>
            <dd className="text-right text-foreground">
              {tenant.deposit_amount != null
                ? formatPropertyCurrency(tenant.deposit_amount)
                : "—"}
              {tenant.deposit_protected ? " · Protected" : ""}
            </dd>
          </div>
        </dl>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/portal/maintenance?new=1">
          <Button className="h-auto min-h-20 w-full flex-col gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
            <Wrench className="size-5" />
            Submit maintenance request
          </Button>
        </Link>
        <Link href="/portal/documents">
          <Button
            variant="outline"
            className="h-auto min-h-20 w-full flex-col gap-2 border-amber-500/30"
          >
            <FileText className="size-5 text-amber-500" />
            View documents
          </Button>
        </Link>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Maintenance summary
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {openCount === 0
            ? "No open maintenance requests."
            : `${openCount} open request${openCount === 1 ? "" : "s"} — ${newCount} new, ${inProgressCount} in progress`}
        </p>
        {openCount > 0 ? (
          <Link
            href="/portal/maintenance"
            className="mt-3 inline-block text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            View all requests
          </Link>
        ) : null}
      </section>

      {landlordName ? (
        <section className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          Questions? Contact your landlord, <strong className="text-foreground">{landlordName}</strong>.
        </section>
      ) : null}
    </div>
  );
}
