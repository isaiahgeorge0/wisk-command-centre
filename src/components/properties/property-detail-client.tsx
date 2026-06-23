"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  FileText,
  PoundSterling,
  Shield,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";
import { PropertyStatusBadge } from "@/components/properties/property-status-badge";
import { PropertyTypeBadge } from "@/components/properties/property-type-badge";
import { Button } from "@/components/ui/button";
import {
  calculateAnnualYield,
  formatPropertyAddress,
  formatPropertyCurrency,
  formatYieldPercent,
} from "@/lib/properties/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/properties/constants";
import type { PropertyWithStats } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyDetailTab =
  | "overview"
  | "tenants"
  | "maintenance"
  | "finances"
  | "documents"
  | "certificates";

const TABS: { id: PropertyDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tenants", label: "Tenants" },
  { id: "maintenance", label: "Maintenance" },
  { id: "finances", label: "Finances" },
  { id: "documents", label: "Documents" },
  { id: "certificates", label: "Certificates" },
];

type PropertyDetailClientProps = {
  property: PropertyWithStats;
};

export function PropertyDetailClient({ property }: PropertyDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PropertyDetailTab>("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const annualYield = calculateAnnualYield(
    property.monthly_rent,
    property.purchase_price
  );

  const handleDeleted = useCallback(() => {
    router.push("/properties/list");
    router.refresh();
  }, [router]);

  return (
    <PageTransition>
      <div className="mb-6">
        <Link
          href="/properties/list"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All properties
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {property.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatPropertyAddress(property)}
          </p>
          <div className="flex flex-wrap gap-2">
            <PropertyStatusBadge status={property.status} />
            <PropertyTypeBadge type={property.property_type} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setFormOpen(true)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            className="min-h-11 gap-2 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border/50 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11",
              activeTab === tab.id
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <OverviewTab property={property} annualYield={annualYield} />
      ) : (
        <PlaceholderTab tab={activeTab} />
      )}

      <PropertyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        property={property}
      />

      <DeletePropertyDialog
        property={property}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}

function OverviewTab({
  property,
  annualYield,
}: {
  property: PropertyWithStats;
  annualYield: number | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Monthly rent"
          value={formatPropertyCurrency(property.monthly_rent)}
          icon={PoundSterling}
        />
        <StatCard
          label="Bedrooms"
          value={property.bedrooms != null ? String(property.bedrooms) : "—"}
          icon={BedDouble}
        />
        <StatCard
          label="Bathrooms"
          value={property.bathrooms != null ? String(property.bathrooms) : "—"}
          icon={Bath}
        />
        <StatCard
          label="Active tenants"
          value={String(property.tenant_count)}
          icon={Users}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">Property details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailField label="Property type" value={PROPERTY_TYPE_LABELS[property.property_type]} />
          <DetailField label="Status" value={property.status} />
          <DetailField
            label="Purchase price"
            value={formatPropertyCurrency(property.purchase_price)}
          />
          <DetailField
            label="Current value"
            value={formatPropertyCurrency(property.current_value)}
          />
          <DetailField
            label="Monthly rent"
            value={formatPropertyCurrency(property.monthly_rent)}
          />
          <DetailField
            label="Open maintenance"
            value={String(property.open_maintenance_count)}
          />
        </dl>
      </div>

      {annualYield != null ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Annual yield
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {formatYieldPercent(annualYield)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on monthly rent and purchase price.
          </p>
        </div>
      ) : null}

      {property.notes ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="text-sm font-semibold text-foreground">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {property.notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PlaceholderTab({
  tab,
}: {
  tab: Exclude<PropertyDetailTab, "overview">;
}) {
  const config = PLACEHOLDER_CONFIG[tab];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-amber-500/10">
        <config.icon className="size-6 text-amber-500" aria-hidden />
      </div>
      <h2 className="text-lg font-medium text-foreground">{config.title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {config.description}
      </p>
    </div>
  );
}

const PLACEHOLDER_CONFIG: Record<
  Exclude<PropertyDetailTab, "overview">,
  { title: string; description: string; icon: typeof Users }
> = {
  tenants: {
    title: "No tenants yet",
    description: "Tenant management is coming in the next release.",
    icon: Users,
  },
  maintenance: {
    title: "No maintenance tickets yet",
    description: "Maintenance tracking is coming in the next release.",
    icon: Wrench,
  },
  finances: {
    title: "Finances coming soon",
    description: "Rent tracking and payment history will appear here.",
    icon: PoundSterling,
  },
  documents: {
    title: "No documents yet",
    description: "Document storage is coming in the next release.",
    icon: FileText,
  },
  certificates: {
    title: "No certificates yet",
    description: "Certificate alerts and tracking are coming soon.",
    icon: Shield,
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Icon className="size-4 text-amber-500" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}
