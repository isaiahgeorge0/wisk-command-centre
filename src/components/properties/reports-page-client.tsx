"use client";

import { Download, PoundSterling } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { RentPaymentStatusBadge } from "@/components/properties/rent-payment-status-badge";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import {
  getInsuranceTypeDisplayName,
  getMaintenanceCategoryDisplayName,
  getMortgageTypeDisplayName,
  getPropertyStatusDisplayName,
  getPropertyTypeDisplayName,
} from "@/lib/properties/display-names";
import {
  formatPropertyAddress,
  formatPropertyCurrency,
  formatPropertyDate,
  formatYieldPercent,
} from "@/lib/properties/format";
import {
  buildPortfolioReport,
  buildPropertyReport,
  type PortfolioReportData,
  type PropertyReportData,
} from "@/lib/properties/report-builder";
import {
  formatTaxYearLabel,
  getCurrentTaxYear,
  getLastTaxYear,
  parseLocalDate,
  toDateInputValue,
} from "@/lib/properties/tax-year";
import type {
  MaintenanceTicket,
  Property,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

type ReportsPageClientProps = {
  properties: Property[];
  allPayments: Record<string, RentPayment[]>;
  allMortgages: Record<string, PropertyMortgage[]>;
  allInsurance: Record<string, PropertyInsurance[]>;
  allTickets: Record<string, MaintenanceTicket[]>;
  tenantNameByPaymentId?: Record<string, string>;
};

type DateRangeMode = "current" | "last" | "custom";

export function ReportsPageClient({
  properties,
  allPayments,
  allMortgages,
  allInsurance,
  allTickets,
  tenantNameByPaymentId = {},
}: ReportsPageClientProps) {
  const currentTaxYear = getCurrentTaxYear();

  const [reportScope, setReportScope] = useState<"portfolio" | string>(
    "portfolio"
  );
  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>("current");
  const [customStart, setCustomStart] = useState(
    toDateInputValue(currentTaxYear.start)
  );
  const [customEnd, setCustomEnd] = useState(
    toDateInputValue(currentTaxYear.end)
  );

  const period = useMemo(() => {
    if (dateRangeMode === "current") {
      const taxYear = getCurrentTaxYear();
      return {
        start: taxYear.start,
        end: taxYear.end,
        label: taxYear.label,
      };
    }
    if (dateRangeMode === "last") {
      const taxYear = getLastTaxYear();
      return {
        start: taxYear.start,
        end: taxYear.end,
        label: taxYear.label,
      };
    }

    const start = parseLocalDate(customStart);
    start.setHours(0, 0, 0, 0);
    const end = parseLocalDate(customEnd);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
      label: formatTaxYearLabel(start, end),
    };
  }, [customEnd, customStart, dateRangeMode]);

  const propertyReports = useMemo(
    () =>
      properties.map((property) =>
        buildPropertyReport(
          property,
          allPayments[property.id] ?? [],
          allMortgages[property.id] ?? [],
          allInsurance[property.id] ?? [],
          allTickets[property.id] ?? [],
          period.start,
          period.end,
          period.label
        )
      ),
    [allInsurance, allMortgages, allPayments, allTickets, period, properties]
  );

  const portfolioReport = useMemo(
    () => buildPortfolioReport(propertyReports, period),
    [period, propertyReports]
  );

  const selectedPropertyReport = useMemo(() => {
    if (reportScope === "portfolio") return null;
    return propertyReports.find((report) => report.property.id === reportScope);
  }, [propertyReports, reportScope]);

  const generatedDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const isTaxYearMode =
    dateRangeMode === "current" || dateRangeMode === "last";
  const periodHeading = isTaxYearMode
    ? `Tax Year ${period.label} · ${formatTaxYearLabel(period.start, period.end)}`
    : period.label;

  return (
    <PageTransition>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}</style>

      <div className="print:hidden">
        <PageHeader
          title="Financial Reports"
          subtitle="UK tax year reports for your portfolio — print or save as PDF."
          icon={
            <PoundSterling
              className="size-6"
              style={{ color: PROPERTIES_ACCENT }}
            />
          }
          className="mb-6"
        />

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <ScopeButton
              active={reportScope === "portfolio"}
              onClick={() => setReportScope("portfolio")}
            >
              Portfolio
            </ScopeButton>
            {properties.map((property) => (
              <ScopeButton
                key={property.id}
                active={reportScope === property.id}
                onClick={() => setReportScope(property.id)}
              >
                {property.name}
              </ScopeButton>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ScopeButton
              active={dateRangeMode === "current"}
              onClick={() => setDateRangeMode("current")}
            >
              This tax year
            </ScopeButton>
            <ScopeButton
              active={dateRangeMode === "last"}
              onClick={() => setDateRangeMode("last")}
            >
              Last tax year
            </ScopeButton>
            <ScopeButton
              active={dateRangeMode === "custom"}
              onClick={() => setDateRangeMode("custom")}
            >
              Custom
            </ScopeButton>
            {dateRangeMode === "custom" ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm min-h-10 text-foreground"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm min-h-10 text-foreground"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_GRADIENT }}
          >
            <Download className="size-4" aria-hidden />
            Save as PDF
          </button>
        </div>
      </div>

      <div className="print:bg-white print:text-[11pt] print:shadow-none">
        {reportScope === "portfolio" ? (
          <PortfolioReportView
            report={portfolioReport}
            generatedDate={generatedDate}
            periodHeading={periodHeading}
            onSelectProperty={setReportScope}
          />
        ) : selectedPropertyReport ? (
          <PropertyReportView
            report={selectedPropertyReport}
            generatedDate={generatedDate}
            periodHeading={periodHeading}
            tenantNameByPaymentId={tenantNameByPaymentId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a property to view its report.
          </p>
        )}
      </div>
    </PageTransition>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium min-h-10 transition-colors",
        active
          ? "bg-amber-500 text-white"
          : "border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ReportHeader({
  periodHeading,
  generatedDate,
}: {
  periodHeading: string;
  generatedDate: string;
}) {
  return (
    <header className="mb-6 print:mb-4">
      <h2 className="text-xl font-bold text-foreground print:text-[14pt]">
        WISK Properties — Financial Report
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{periodHeading}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Generated {generatedDate}
      </p>
      <hr className="mt-4 border-border/60 print:border-[#e5e7eb]" />
    </header>
  );
}

function PortfolioReportView({
  report,
  generatedDate,
  periodHeading,
  onSelectProperty,
}: {
  report: PortfolioReportData;
  generatedDate: string;
  periodHeading: string;
  onSelectProperty: (propertyId: string) => void;
}) {
  const vacancyProperties = report.properties.filter(
    (item) => item.vacancyLoss > 0
  );
  const hasYieldData = report.properties.some(
    (item) => item.grossYield != null || item.netYield != null
  );

  return (
    <div className="space-y-8 print:space-y-6">
      <ReportHeader
        periodHeading={periodHeading}
        generatedDate={generatedDate}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:gap-2">
        <StatTile
          label="Total rent expected"
          value={formatPropertyCurrency(report.totalRentExpected)}
        />
        <StatTile
          label="Total collected"
          value={formatPropertyCurrency(report.totalRentCollected)}
        />
        <StatTile
          label="Total costs"
          value={formatPropertyCurrency(report.totalCosts)}
        />
        <StatTile
          label="Net income"
          value={formatPropertyCurrency(report.totalNetIncome)}
          valueClassName={netIncomeColorClass(report.totalNetIncome)}
        />
      </section>

      <section className="print:break-before-page">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Cost breakdown
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:gap-2">
          <StatTile
            label="Mortgage costs"
            value={formatPropertyCurrency(report.totalMortgageCost)}
          />
          <StatTile
            label="Insurance costs"
            value={formatPropertyCurrency(report.totalInsuranceCost)}
          />
          <StatTile
            label="Maintenance costs"
            value={formatPropertyCurrency(report.totalMaintenanceCost)}
          />
        </div>
      </section>

      {hasYieldData ? (
        <section className="print:break-before-page">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Yield overview
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:gap-2">
            <StatTile
              label="Avg gross yield"
              value={formatYieldPercent(report.avgGrossYield)}
              valueClassName={
                report.avgGrossYield != null
                  ? getYieldColorClass(report.avgGrossYield)
                  : undefined
              }
            />
            <StatTile
              label="Avg net yield"
              value={formatYieldPercent(report.avgNetYield)}
              valueClassName={
                report.avgNetYield != null
                  ? getYieldColorClass(report.avgNetYield)
                  : undefined
              }
            />
            <StatTile
              label="Occupancy rate"
              value={`${report.occupancyRate.toFixed(0)}%`}
            />
          </div>
        </section>
      ) : null}

      <section className="print:break-before-page">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Per-property summary
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Rent collected</th>
                <th className="px-4 py-3 font-medium">Costs</th>
                <th className="px-4 py-3 font-medium">Net income</th>
                <th className="px-4 py-3 font-medium">Gross yield</th>
                <th className="px-4 py-3 font-medium">Net yield</th>
              </tr>
            </thead>
            <tbody>
              {report.properties.map((item) => (
                <tr
                  key={item.property.id}
                  className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectProperty(item.property.id)}
                      className="font-medium text-foreground underline-offset-2 hover:underline print:hidden"
                    >
                      {item.property.name}
                    </button>
                    <span className="hidden font-medium print:inline">
                      {item.property.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPropertyCurrency(item.totalRentCollected)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPropertyCurrency(item.totalCosts)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums font-medium",
                      netIncomeColorClass(item.netIncome)
                    )}
                  >
                    {formatPropertyCurrency(item.netIncome)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums",
                      item.grossYield != null
                        ? getYieldColorClass(item.grossYield)
                        : ""
                    )}
                  >
                    {formatYieldPercent(item.grossYield)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums",
                      item.netYield != null
                        ? getYieldColorClass(item.netYield)
                        : ""
                    )}
                  >
                    {formatYieldPercent(item.netYield)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {vacancyProperties.length > 0 ? (
        <section className="print:break-before-page">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Vacancy loss
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Collected</th>
                  <th className="px-4 py-3 font-medium">Loss</th>
                </tr>
              </thead>
              <tbody>
                {vacancyProperties.map((item) => (
                  <tr
                    key={item.property.id}
                    className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.property.name}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(item.totalRentExpected)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(item.totalRentCollected)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-orange-500">
                      −{formatPropertyCurrency(item.vacancyLoss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PropertyReportView({
  report,
  generatedDate,
  periodHeading,
  tenantNameByPaymentId,
}: {
  report: PropertyReportData;
  generatedDate: string;
  periodHeading: string;
  tenantNameByPaymentId: Record<string, string>;
}) {
  const { property } = report;

  return (
    <div className="space-y-8 print:space-y-6">
      <ReportHeader
        periodHeading={periodHeading}
        generatedDate={generatedDate}
      />

      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Property summary
        </h3>
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-4 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
          <p className="font-medium text-foreground">
            {formatPropertyAddress(property)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <DetailItem
              label="Type"
              value={getPropertyTypeDisplayName(property.property_type)}
            />
            <DetailItem
              label="Status"
              value={getPropertyStatusDisplayName(property.status)}
            />
            <DetailItem
              label="Purchase price"
              value={formatPropertyCurrency(property.purchase_price)}
            />
            <DetailItem
              label="Current value"
              value={formatPropertyCurrency(property.current_value)}
            />
            <DetailItem
              label="Monthly rent"
              value={formatPropertyCurrency(property.monthly_rent)}
            />
          </dl>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 print:gap-2">
        <StatTile
          label="Rent expected"
          value={formatPropertyCurrency(report.totalRentExpected)}
        />
        <StatTile
          label="Rent collected"
          value={formatPropertyCurrency(report.totalRentCollected)}
        />
        <StatTile
          label="Vacancy loss"
          value={formatPropertyCurrency(report.vacancyLoss)}
        />
        <StatTile
          label="Mortgage cost"
          value={formatPropertyCurrency(report.mortgageCost)}
        />
        <StatTile
          label="Insurance cost"
          value={formatPropertyCurrency(report.insuranceCost)}
        />
        <StatTile
          label="Maintenance cost"
          value={formatPropertyCurrency(report.maintenanceCost)}
        />
      </section>

      <section>
        <div
          className={cn(
            "rounded-2xl border px-6 py-5 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none",
            report.contractedNetIncome >= 0
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-orange-500/20 bg-orange-500/5"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Contracted net income
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold tabular-nums",
              netIncomeColorClass(report.contractedNetIncome)
            )}
          >
            {formatPropertyCurrency(report.contractedNetIncome)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on contracted rent of{" "}
            {formatPropertyCurrency(property.monthly_rent)}/month
          </p>
        </div>
      </section>

      <section className="print:break-before-page">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Yield metrics
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:gap-2">
          <StatTile
            label="Gross yield"
            value={formatYieldPercent(report.grossYield)}
            valueClassName={
              report.grossYield != null
                ? getYieldColorClass(report.grossYield)
                : undefined
            }
          />
          <StatTile
            label="Net yield"
            value={formatYieldPercent(report.netYield)}
            valueClassName={
              report.netYield != null
                ? getYieldColorClass(report.netYield)
                : undefined
            }
          />
          <StatTile
            label="ROI"
            value={formatYieldPercent(report.roi)}
            valueClassName={
              report.roi != null ? getYieldColorClass(report.roi) : undefined
            }
          />
        </div>
      </section>

      <section className="print:break-before-page">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Payment history
        </h3>
        {report.rentPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments in this period.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Paid date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rentPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                  >
                    <td className="px-4 py-3">
                      {tenantNameByPaymentId[payment.id] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatPropertyDate(payment.due_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPropertyDate(payment.paid_date)}
                    </td>
                    <td className="px-4 py-3">
                      <RentPaymentStatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {report.mortgages.length > 0 ? (
        <section className="print:break-before-page">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Mortgages
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                  <th className="px-4 py-3 font-medium">Lender</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Monthly payment</th>
                  <th className="px-4 py-3 font-medium">Interest rate</th>
                  <th className="px-4 py-3 font-medium">Fixed rate end</th>
                  <th className="px-4 py-3 font-medium">Outstanding balance</th>
                </tr>
              </thead>
              <tbody>
                {report.mortgages.map((mortgage) => (
                  <tr
                    key={mortgage.id}
                    className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                  >
                    <td className="px-4 py-3">{mortgage.lender}</td>
                    <td className="px-4 py-3">
                      {getMortgageTypeDisplayName(mortgage.mortgage_type)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(mortgage.monthly_payment)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {mortgage.interest_rate != null
                        ? `${mortgage.interest_rate}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatPropertyDate(mortgage.fixed_rate_end_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(mortgage.outstanding_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {report.insurance.length > 0 ? (
        <section className="print:break-before-page">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Insurance
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                  <th className="px-4 py-3 font-medium">Insurer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Annual premium</th>
                  <th className="px-4 py-3 font-medium">Renewal date</th>
                </tr>
              </thead>
              <tbody>
                {report.insurance.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                  >
                    <td className="px-4 py-3">{record.insurer}</td>
                    <td className="px-4 py-3">
                      {getInsuranceTypeDisplayName(record.insurance_type)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(record.annual_premium)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPropertyDate(record.renewal_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {report.maintenanceTickets.length > 0 ? (
        <section className="print:break-before-page">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Maintenance costs
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground print:border-[#e5e7eb]">
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Resolved date</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {report.maintenanceTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border/40 last:border-0 print:border-[#e5e7eb]"
                  >
                    <td className="px-4 py-3">{ticket.title}</td>
                    <td className="px-4 py-3">
                      {getMaintenanceCategoryDisplayName(ticket.category)}
                    </td>
                    <td className="px-4 py-3 capitalize">{ticket.priority}</td>
                    <td className="px-4 py-3">
                      {formatPropertyDate(ticket.resolved_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPropertyCurrency(ticket.actual_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            Total maintenance cost:{" "}
            {formatPropertyCurrency(report.maintenanceCost)}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 print:border print:border-[#e5e7eb] print:bg-white print:shadow-none">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums text-foreground",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function netIncomeColorClass(amount: number): string {
  if (amount > 0) return "text-emerald-500";
  if (amount < 0) return "text-orange-500";
  return "text-foreground";
}

function getYieldColorClass(yieldPercent: number): string {
  if (yieldPercent >= 7) return "text-emerald-500";
  if (yieldPercent >= 4) return "text-amber-500";
  return "text-orange-500";
}
