"use client";

import { Download } from "lucide-react";

import { DISCLAIMER_TEXT } from "@/lib/properties/legal-grounds";
import { formatDateGB } from "@/lib/properties/notice-calculations";
import type { Tenant } from "@/lib/properties/types";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

type Section13NoticeDocumentProps = {
  tenant: Tenant & { property_name?: string };
  proposedRent: number;
  newRentStartDate: Date;
  noticeServedDate: Date;
  lastIncreaseDate: Date | null;
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
};

export function Section13NoticeDocument({
  tenant,
  proposedRent,
  newRentStartDate,
  noticeServedDate,
  lastIncreaseDate,
  landlordName,
  landlordAddress,
  landlordPhone,
}: Section13NoticeDocumentProps) {
  const today = new Date();
  const generatedDate = formatDateGB(today);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="mb-6 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: CTA_GRADIENT }}
        >
          <Download className="size-4" aria-hidden />
          Save as PDF
        </button>
      </div>

      {/* Document body */}
      <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-border/60 bg-card/80 p-8 text-sm print:border-0 print:bg-white print:p-0 print:shadow-none print:text-[11pt]">

        {/* Header */}
        <div className="border-b border-border/60 pb-4 print:border-[#e5e7eb]">
          <h1 className="text-xl font-bold uppercase tracking-wide text-foreground print:text-[14pt]">
            Form 4A
          </h1>
          <h2 className="text-lg font-semibold text-foreground">
            Landlord&apos;s notice proposing a new rent under an assured
            periodic tenancy
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Housing Act 1988 section 13(2), as amended
          </p>
        </div>

        {/* Guidance */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 print:border print:border-[#e5e7eb]">
          <p className="text-xs leading-relaxed text-foreground">
            <strong>Please read this notice carefully.</strong> It proposes a
            new rent for the property you rent. If you consider the proposed rent
            is too high you can refer this notice to a Rent Assessment Committee
            before the start date of the new rent. Contact your local Rent
            Assessment Committee for advice on how to do this.
          </p>
        </div>

        {/* Section 1 — To the tenant */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 1 — To the tenant(s)
          </h3>
          <p className="text-foreground">
            Name of tenant(s):{" "}
            <strong>
              {tenant.first_name} {tenant.last_name}
            </strong>
          </p>
          {tenant.property_name ? (
            <p className="mt-1 text-foreground">
              Address of property: <strong>{tenant.property_name}</strong>
            </p>
          ) : null}
        </section>

        {/* Section 2 — Tenancy details */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 2 — Tenancy details
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tenancy start date</p>
                <p className="font-medium text-foreground">
                  {formatDateGB(new Date(tenant.tenancy_start))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rent frequency</p>
                <p className="capitalize font-medium text-foreground">
                  {tenant.rent_frequency}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current rent</p>
                <p className="font-medium text-foreground">
                  £{tenant.rent_amount}/{tenant.rent_frequency}
                </p>
              </div>
              {lastIncreaseDate ? (
                <div>
                  <p className="text-muted-foreground">Date of last increase</p>
                  <p className="font-medium text-foreground">
                    {formatDateGB(lastIncreaseDate)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Section 3 — Proposed new rent */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 3 — Proposed new rent
          </h3>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 print:border print:border-[#e5e7eb]">
            <p className="text-muted-foreground">Proposed new rent (per {tenant.rent_frequency})</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              £{proposedRent.toFixed(2)}
            </p>
            <p className="mt-3 text-muted-foreground">
              New rent start date
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {formatDateGB(newRentStartDate)}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            If you wish to refer the proposed rent to a Rent Assessment
            Committee, you must do so before the above start date. After that
            date, this notice will have legal effect if it has been duly served.
          </p>
        </section>

        {/* Section 4 — Charges (optional) */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 4 — Other charges (if applicable)
          </h3>
          <p className="text-xs text-muted-foreground">
            If the tenancy agreement provides for separate charges such as
            service charges, these should be itemised here. If there are no
            separate charges, leave blank.
          </p>
          <div className="mt-3 min-h-[60px] rounded-lg border border-border/60 bg-muted/10 p-3 print:border print:border-[#e5e7eb]">
            <p className="text-xs text-muted-foreground">
              No separate charges proposed.
            </p>
          </div>
        </section>

        {/* Section 5 — Notice details */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 5 — Notice details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date this notice is served</p>
              <p className="font-medium text-foreground">
                {formatDateGB(noticeServedDate)}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 — Landlord details */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 6 — Name and address of landlord / agent
          </h3>
          <p className="text-foreground">
            <strong>{landlordName || "—"}</strong>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {landlordAddress || "—"}
          </p>
          {landlordPhone ? (
            <p className="mt-1 text-foreground">Tel: {landlordPhone}</p>
          ) : null}
        </section>

        {/* Signature line */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Signature
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">
                Signed (landlord or agent)
              </p>
              <div className="mt-6 border-b border-foreground/30 print:border-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <div className="mt-6 border-b border-foreground/30 print:border-black" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Notice prepared using WISK on {generatedDate}
          </p>
        </section>

        {/* Disclaimer — always printed */}
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 print:border print:border-[#e5e7eb]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 print:text-black">
            Legal disclaimer
          </p>
          <p className="text-xs leading-relaxed text-foreground print:text-black">
            {DISCLAIMER_TEXT}
          </p>
        </section>
      </div>
    </>
  );
}
