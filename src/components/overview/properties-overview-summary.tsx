import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  HardHat,
  MessageSquare,
  PoundSterling,
  Users,
  Wrench,
} from "lucide-react";

import { MaintenancePriorityBadge } from "@/components/properties/maintenance-priority-badge";
import { MaintenanceStatusBadge } from "@/components/properties/maintenance-status-badge";
import { Badge } from "@/components/ui/badge";
import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import {
  daysUntilDate,
  daysUntilExpiryClass,
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import type {
  ContractorAccessRequestWithDetails,
  MaintenanceTicket,
  PortfolioStats,
  PropertyCertificate,
  RentDueFlag,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertiesOverviewSummaryProps = {
  stats: PortfolioStats;
  rentDueFlags: RentDueFlag[];
  openMaintenanceTickets: MaintenanceTicket[];
  unreadMessageCount: number;
  expiringCertificates: PropertyCertificate[];
  pendingAccessRequests: ContractorAccessRequestWithDetails[];
};

function maintenancePropertyName(
  ticket: MaintenanceTicket & { properties?: { name: string } | null }
): string {
  return ticket.properties?.name ?? "Unknown property";
}

function certificatePropertyName(
  cert: PropertyCertificate & { properties?: { name: string } | null }
): string {
  return cert.properties?.name ?? "Unknown property";
}

function pendingRequestContractorName(
  request: ContractorAccessRequestWithDetails
): string {
  const contractors = request.job_sheets?.contractors;
  if (!contractors) return "Unknown contractor";
  if (Array.isArray(contractors)) {
    return formatContractorDisplayName(contractors[0]?.name);
  }
  return formatContractorDisplayName(contractors.name);
}

export function PropertiesOverviewSummary({
  stats,
  openMaintenanceTickets,
  unreadMessageCount,
  expiringCertificates,
  pendingAccessRequests,
}: PropertiesOverviewSummaryProps) {
  const items = [
    {
      label: "Total properties",
      value: String(stats.totalProperties),
      icon: Building2,
    },
    {
      label: "Occupied vs vacant",
      value: `${stats.occupiedCount} / ${stats.vacantCount}`,
      icon: Users,
    },
    {
      label: "Rent due this month",
      value: formatPropertyCurrency(stats.rentDueThisMonth),
      icon: PoundSterling,
    },
    {
      label: "Open maintenance",
      value: String(stats.openMaintenanceCount),
      icon: Wrench,
    },
  ];

  return (
    <>
      <section className="mb-8" aria-label="Properties portfolio summary">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Portfolio summary
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A lightweight snapshot of your property portfolio.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-amber-500/15 bg-card/60 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Icon className="size-4 text-amber-500" aria-hidden />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {pendingAccessRequests.length > 0 ? (
        <section className="mb-6" aria-label="Contractor access requests">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardHat className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Contractor access requests
              </h3>
            </div>
            <Link
              href="/properties/maintenance"
              className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card/40">
            {pendingAccessRequests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {pendingRequestContractorName(request)} requests access
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {request.job_sheets?.maintenance_tickets?.title ??
                      "Maintenance job"}
                    {" · "}
                    {request.job_sheets?.properties?.name ?? "Property"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPropertyDate(request.requested_date)}
                    {request.requested_time
                      ? ` · ${request.requested_time}`
                      : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300"
                >
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {openMaintenanceTickets.length > 0 ? (
        <section className="mb-6" aria-label="Open maintenance">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Open maintenance
              </h3>
            </div>
            <Link
              href="/properties/maintenance"
              className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card/40">
            {openMaintenanceTickets.slice(0, 3).map((ticket) => (
              <Link
                key={ticket.id}
                href={`/properties/${ticket.property_id}?tab=maintenance`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {ticket.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {maintenancePropertyName(ticket)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <MaintenancePriorityBadge priority={ticket.priority} />
                  <MaintenanceStatusBadge status={ticket.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {unreadMessageCount > 0 ? (
        <section className="mb-6" aria-label="Unread messages">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Unread messages
              </h3>
            </div>
            <Link
              href="/properties/communication"
              className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              View all
            </Link>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-card/60 px-3 py-2.5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {unreadMessageCount}
              </span>{" "}
              unread {unreadMessageCount === 1 ? "message" : "messages"} from
              tenants.
            </p>
            <Link
              href="/properties/communication"
              className="mt-1 inline-flex text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              Open communication hub →
            </Link>
          </div>
        </section>
      ) : null}

      {expiringCertificates.length > 0 ? (
        <section className="mb-6" aria-label="Certificate alerts">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Certificate alerts
              </h3>
            </div>
            <Link
              href="/properties/list"
              className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              View properties
            </Link>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card/40">
            {expiringCertificates.slice(0, 3).map((cert) => {
              const days = daysUntilDate(cert.expiry_date);
              return (
                <Link
                  key={cert.id}
                  href={`/properties/${cert.property_id}?tab=certificates`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getCertificateTypeDisplayName(cert.certificate_type)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {certificatePropertyName(cert)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      daysUntilExpiryClass(days)
                    )}
                  >
                    {days === 0
                      ? "Expires today"
                      : days === 1
                        ? "Expires tomorrow"
                        : days != null
                          ? `${days} days`
                          : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
