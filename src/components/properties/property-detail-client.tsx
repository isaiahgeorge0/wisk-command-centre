"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  PoundSterling,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { togglePropertyAlerts } from "@/app/(dashboard)/properties/actions";
import { PageTransition } from "@/components/layout/page-transition";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { PropertyCertificatesTab } from "@/components/properties/property-certificates-tab";
import { PropertyDocumentsTab } from "@/components/properties/property-documents-tab";
import { PropertyFinancesTab } from "@/components/properties/property-finances-tab";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";
import { PropertyMaintenanceTab } from "@/components/properties/property-maintenance-tab";
import { PropertyStatusBadge } from "@/components/properties/property-status-badge";
import { PropertyTenantsTab } from "@/components/properties/property-tenants-tab";
import { PropertyTypeBadge } from "@/components/properties/property-type-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getPropertyStatusDisplayName,
  getPropertyTypeDisplayName,
} from "@/lib/properties/display-names";
import {
  calculateAnnualYield,
  formatPropertyAddress,
  formatPropertyCurrency,
  formatYieldPercent,
} from "@/lib/properties/format";
import type {
  CertificateAlertLog,
  MaintenanceTicket,
  PropertyCertificate,
  PropertyDocument,
  PropertyInsurance,
  PropertyMortgage,
  FinancialSummary,
  PropertyWithStats,
  RentPaymentWithDetails,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

export type PropertyDetailTab =
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
  tenants: Tenant[];
  maintenanceTickets: MaintenanceTicket[];
  rentPayments: RentPaymentWithDetails[];
  certificates: PropertyCertificate[];
  documents: PropertyDocument[];
  certificateAlerts: CertificateAlertLog[];
  mortgages: PropertyMortgage[];
  insurance: PropertyInsurance[];
  monthlyFinancialSummary: FinancialSummary | null;
  annualFinancialSummary: FinancialSummary | null;
  initialTab?: PropertyDetailTab;
};

export function PropertyDetailClient({
  property,
  tenants,
  maintenanceTickets,
  rentPayments,
  certificates,
  documents,
  certificateAlerts,
  mortgages,
  insurance,
  monthlyFinancialSummary,
  annualFinancialSummary,
  initialTab = "overview",
}: PropertyDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PropertyDetailTab>(initialTab);
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
              "min-h-11 shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
      ) : activeTab === "tenants" ? (
        <PropertyTenantsTab propertyId={property.id} tenants={tenants} />
      ) : activeTab === "maintenance" ? (
        <PropertyMaintenanceTab
          propertyId={property.id}
          tickets={maintenanceTickets}
          tenants={tenants}
        />
      ) : activeTab === "finances" ? (
        <PropertyFinancesTab
          propertyId={property.id}
          payments={rentPayments}
          tenants={tenants}
          mortgages={mortgages}
          insurance={insurance}
          monthlyFinancialSummary={monthlyFinancialSummary}
          annualFinancialSummary={annualFinancialSummary}
        />
      ) : activeTab === "certificates" ? (
        <PropertyCertificatesTab
          propertyId={property.id}
          propertyName={property.name}
          propertyType={property.property_type}
          certificates={certificates}
          documents={documents}
          alerts={certificateAlerts}
          onNavigateToDocuments={() => setActiveTab("documents")}
        />
      ) : (
        <PropertyDocumentsTab
          propertyId={property.id}
          documents={documents}
          certificates={certificates}
          onNavigateToCertificates={() => setActiveTab("certificates")}
        />
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const alertsEnabled = property.alerts_enabled ?? true;

  const handleAlertsToggle = (enabled: boolean) => {
    startTransition(async () => {
      await togglePropertyAlerts(property.id, enabled);
      router.refresh();
    });
  };

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
          <DetailField
            label="Property type"
            value={getPropertyTypeDisplayName(property.property_type)}
          />
          <DetailField
            label="Status"
            value={getPropertyStatusDisplayName(property.status)}
          />
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

      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">Alert settings</h2>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="cert-alerts" className="text-sm font-medium">
              Certificate expiry alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive email reminders at 90, 30, and 7 days before certificates
              expire.
            </p>
          </div>
          <Switch
            id="cert-alerts"
            checked={alertsEnabled}
            onCheckedChange={handleAlertsToggle}
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  );
}

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
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
