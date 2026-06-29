"use client";

import { Building2, CheckCircle2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteInsurance,
  deleteMortgage,
  deleteRentPayment,
  toggleInsuranceAlerts,
  toggleMortgageAlerts,
  updateRentPayment,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesProTeaser } from "@/components/properties/properties-pro-teaser";
import { PropertyFinancialSummary } from "@/components/properties/property-financial-summary";
import { PropertyInsuranceFormDialog } from "@/components/properties/property-insurance-form-dialog";
import { PropertyMortgageFormDialog } from "@/components/properties/property-mortgage-form-dialog";
import { RentPaymentFormDialog } from "@/components/properties/rent-payment-form-dialog";
import { RentPaymentStatusBadge } from "@/components/properties/rent-payment-status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getInsuranceTypeDisplayName,
  getMortgageTypeDisplayName,
} from "@/lib/properties/display-names";
import {
  daysUntilDate,
  daysUntilExpiryClass,
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import { buildPropertyFinanceStats } from "@/lib/properties/selectors";
import type {
  FinancialSummary,
  PropertyInsurance,
  PropertyMortgage,
  RentPaymentWithDetails,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyFinancesTabProps = {
  propertyId: string;
  payments: RentPaymentWithDetails[];
  tenants: Tenant[];
  mortgages: PropertyMortgage[];
  insurance: PropertyInsurance[];
  monthlyFinancialSummary: FinancialSummary | null;
  annualFinancialSummary: FinancialSummary | null;
  hasProPlan: boolean;
};

export function PropertyFinancesTab({
  propertyId,
  payments,
  tenants,
  mortgages,
  insurance,
  monthlyFinancialSummary,
  annualFinancialSummary,
  hasProPlan,
}: PropertyFinancesTabProps) {
  const router = useRouter();
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPaymentWithDetails | null>(null);
  const [deletePaymentTarget, setDeletePaymentTarget] =
    useState<RentPaymentWithDetails | null>(null);
  const [mortgageFormOpen, setMortgageFormOpen] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState<PropertyMortgage | null>(null);
  const [deleteMortgageTarget, setDeleteMortgageTarget] =
    useState<PropertyMortgage | null>(null);
  const [insuranceFormOpen, setInsuranceFormOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] =
    useState<PropertyInsurance | null>(null);
  const [deleteInsuranceTarget, setDeleteInsuranceTarget] =
    useState<PropertyInsurance | null>(null);
  const [isPending, startTransition] = useTransition();
  const stats = buildPropertyFinanceStats(payments);

  const handleMarkPaid = (payment: RentPaymentWithDetails) => {
    startTransition(async () => {
      await updateRentPayment(payment.id, {
        status: "paid",
        paid_date: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    });
  };

  const handleDeletePayment = () => {
    if (!deletePaymentTarget) return;
    startTransition(async () => {
      await deleteRentPayment(deletePaymentTarget.id);
      setDeletePaymentTarget(null);
      router.refresh();
    });
  };

  const handleDeleteMortgage = () => {
    if (!deleteMortgageTarget) return;
    startTransition(async () => {
      await deleteMortgage(deleteMortgageTarget.id);
      setDeleteMortgageTarget(null);
      router.refresh();
    });
  };

  const handleDeleteInsurance = () => {
    if (!deleteInsuranceTarget) return;
    startTransition(async () => {
      await deleteInsurance(deleteInsuranceTarget.id);
      setDeleteInsuranceTarget(null);
      router.refresh();
    });
  };

  const handleToggleMortgageAlerts = (mortgageId: string, enabled: boolean) => {
    startTransition(async () => {
      await toggleMortgageAlerts(mortgageId, enabled);
      router.refresh();
    });
  };

  const handleToggleInsuranceAlerts = (insuranceId: string, enabled: boolean) => {
    startTransition(async () => {
      await toggleInsuranceAlerts(insuranceId, enabled);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {hasProPlan && monthlyFinancialSummary && annualFinancialSummary ? (
        <PropertyFinancialSummary
          monthlySummary={monthlyFinancialSummary}
          annualSummary={annualFinancialSummary}
        />
      ) : null}

      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Expected this month" value={formatPropertyCurrency(stats.expectedThisMonth)} />
          <StatTile label="Received this month" value={formatPropertyCurrency(stats.receivedThisMonth)} />
          <StatTile label="Outstanding" value={formatPropertyCurrency(stats.outstanding)} />
          <StatTile label="Total received" value={formatPropertyCurrency(stats.totalReceivedAllTime)} />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => { setEditingPayment(null); setPaymentFormOpen(true); }}
            disabled={tenants.length === 0}
            className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
          >
            <Plus className="size-4" />
            Add payment
          </Button>
        </div>

        {payments.length === 0 ? (
          <RentEmptyState onAdd={() => { setEditingPayment(null); setPaymentFormOpen(true); }} />
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{payment.tenant_name}</p>
                      <RentPaymentStatusBadge status={payment.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Due {formatPropertyDate(payment.due_date)} · {formatPropertyCurrency(payment.amount)}
                      {payment.paid_date ? ` · Paid ${formatPropertyDate(payment.paid_date)}` : ""}
                      {payment.payment_method ? ` · ${payment.payment_method}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(payment.status === "pending" || payment.status === "late") ? (
                      <Button variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={() => handleMarkPaid(payment)} disabled={isPending}>
                        <CheckCircle2 className="size-4" />
                        Mark paid
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setEditingPayment(payment); setPaymentFormOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-11 text-destructive" onClick={() => setDeletePaymentTarget(payment)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {hasProPlan ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-foreground">Mortgages</h2>
            </div>
            <Button
              onClick={() => { setEditingMortgage(null); setMortgageFormOpen(true); }}
              className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            >
              <Plus className="size-4" />
              Add mortgage
            </Button>
          </div>

          {mortgages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No mortgages added</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mortgages.map((mortgage) => {
                const fixedRateDays = daysUntilDate(mortgage.fixed_rate_end_date);
                return (
                  <div key={mortgage.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">{mortgage.lender}</h3>
                          <Badge variant="outline">
                            {getMortgageTypeDisplayName(mortgage.mortgage_type)}
                          </Badge>
                        </div>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          {formatPropertyCurrency(mortgage.monthly_payment)}
                          <span className="text-sm font-normal text-muted-foreground"> / month</span>
                        </p>
                        {mortgage.interest_rate != null ? (
                          <p className="text-sm text-muted-foreground">
                            Interest rate: {mortgage.interest_rate}%
                          </p>
                        ) : null}
                        {mortgage.fixed_rate_end_date ? (
                          <p className={cn("text-sm font-medium", daysUntilExpiryClass(fixedRateDays))}>
                            Fixed rate ends {formatPropertyDate(mortgage.fixed_rate_end_date)}
                            {fixedRateDays != null && fixedRateDays >= 0
                              ? ` · ${fixedRateDays} days`
                              : fixedRateDays != null && fixedRateDays < 0
                                ? ` · ended ${Math.abs(fixedRateDays)} days ago`
                                : ""}
                          </p>
                        ) : null}
                        {mortgage.outstanding_balance != null ? (
                          <p className="text-sm text-muted-foreground">
                            Outstanding: {formatPropertyCurrency(mortgage.outstanding_balance)}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-3 pt-1">
                          <Switch
                            id={`mortgage-alerts-${mortgage.id}`}
                            checked={mortgage.alerts_enabled}
                            onCheckedChange={(checked) =>
                              handleToggleMortgageAlerts(mortgage.id, checked)
                            }
                            disabled={isPending}
                          />
                          <Label
                            htmlFor={`mortgage-alerts-${mortgage.id}`}
                            className="text-sm text-muted-foreground"
                          >
                            Alerts {mortgage.alerts_enabled ? "on" : "off"}
                          </Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setEditingMortgage(mortgage); setMortgageFormOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-11 text-destructive" onClick={() => setDeleteMortgageTarget(mortgage)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <PropertiesProTeaser
          title="Mortgage tracking"
          description="Track mortgage payments, interest rates, and fixed-rate end dates with renewal alerts."
          features={[
            "Monthly mortgage cost breakdown",
            "Fixed-rate end date alerts",
            "Outstanding balance tracking",
            "Interest rate monitoring",
          ]}
        />
      )}

      {hasProPlan ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-foreground">Insurance</h2>
            </div>
            <Button
              onClick={() => { setEditingInsurance(null); setInsuranceFormOpen(true); }}
              className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            >
              <Plus className="size-4" />
              Add insurance
            </Button>
          </div>

          {insurance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No insurance records added</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insurance.map((record) => {
                const renewalDays = daysUntilDate(record.renewal_date);
                return (
                  <div key={record.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">{record.insurer}</h3>
                          <Badge variant="outline">
                            {getInsuranceTypeDisplayName(record.insurance_type)}
                          </Badge>
                        </div>
                        {record.annual_premium != null ? (
                          <p className="text-lg font-semibold tabular-nums text-foreground">
                            {formatPropertyCurrency(record.annual_premium)}
                            <span className="text-sm font-normal text-muted-foreground"> / year</span>
                          </p>
                        ) : null}
                        {record.renewal_date ? (
                          <p className={cn("text-sm font-medium", daysUntilExpiryClass(renewalDays))}>
                            Renews {formatPropertyDate(record.renewal_date)}
                            {renewalDays != null && renewalDays >= 0
                              ? ` · ${renewalDays} days`
                              : renewalDays != null && renewalDays < 0
                                ? ` · overdue ${Math.abs(renewalDays)} days`
                                : ""}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-3 pt-1">
                          <Switch
                            id={`insurance-alerts-${record.id}`}
                            checked={record.alerts_enabled}
                            onCheckedChange={(checked) =>
                              handleToggleInsuranceAlerts(record.id, checked)
                            }
                            disabled={isPending}
                          />
                          <Label
                            htmlFor={`insurance-alerts-${record.id}`}
                            className="text-sm text-muted-foreground"
                          >
                            Alerts {record.alerts_enabled ? "on" : "off"}
                          </Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setEditingInsurance(record); setInsuranceFormOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-11 text-destructive" onClick={() => setDeleteInsuranceTarget(record)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <PropertiesProTeaser
          title="Insurance tracking"
          description="Manage building and contents insurance with renewal reminders before they lapse."
          features={[
            "Annual premium tracking",
            "Renewal date alerts",
            "Multiple policies per property",
          ]}
        />
      )}

      <RentPaymentFormDialog open={paymentFormOpen} onOpenChange={setPaymentFormOpen} propertyId={propertyId} tenants={tenants} payment={editingPayment} />
      <PropertyMortgageFormDialog open={mortgageFormOpen} onOpenChange={setMortgageFormOpen} propertyId={propertyId} mortgage={editingMortgage} />
      <PropertyInsuranceFormDialog open={insuranceFormOpen} onOpenChange={setInsuranceFormOpen} propertyId={propertyId} insurance={editingInsurance} />

      <AlertDialog open={Boolean(deletePaymentTarget)} onOpenChange={(open) => !open && setDeletePaymentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this rent payment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeletePayment} disabled={isPending} className="min-h-11">
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteMortgageTarget)} onOpenChange={(open) => !open && setDeleteMortgageTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mortgage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this mortgage record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteMortgage} disabled={isPending} className="min-h-11">
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteInsuranceTarget)} onOpenChange={(open) => !open && setDeleteInsuranceTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete insurance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this insurance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteInsurance} disabled={isPending} className="min-h-11">
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function RentEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
      <h2 className="text-lg font-medium text-foreground">No rent payments recorded</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add a payment to start tracking rent collection.
      </p>
      <Button onClick={onAdd} className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
        <Plus className="size-4" />
        Add payment
      </Button>
    </div>
  );
}
