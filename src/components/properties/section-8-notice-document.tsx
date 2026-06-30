"use client";

import { Download } from "lucide-react";

import {
  DISCLAIMER_TEXT,
  POSSESSION_GROUNDS,
} from "@/lib/properties/legal-grounds";
import { formatDateGB } from "@/lib/properties/notice-calculations";
import type { Tenant } from "@/lib/properties/types";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

type Section8NoticeDocumentProps = {
  tenant: Tenant & { property_name?: string };
  selectedGrounds: string[];
  explanations: Record<string, string>;
  noticeServedDate: Date;
  earliestCourtDate: Date;
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
};

export function Section8NoticeDocument({
  tenant,
  selectedGrounds,
  explanations,
  noticeServedDate,
  earliestCourtDate,
  landlordName,
  landlordAddress,
  landlordPhone,
}: Section8NoticeDocumentProps) {
  const grounds = selectedGrounds
    .map((id) => POSSESSION_GROUNDS.find((g) => g.id === id))
    .filter(Boolean) as (typeof POSSESSION_GROUNDS)[0][];

  // Latest date = 12 months from notice served
  const latestDate = new Date(noticeServedDate);
  latestDate.setFullYear(latestDate.getFullYear() + 1);

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
            Form 3A
          </h1>
          <h2 className="text-lg font-semibold text-foreground">
            Notice seeking possession of a property let on an assured tenancy
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Housing Act 1988 section 8, as amended by the Housing Act 1996
          </p>
        </div>

        {/* Important notice — mirrors Form 3A guidance */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 print:border print:border-[#e5e7eb]">
          <p className="text-xs leading-relaxed text-foreground">
            <strong>Please read this notice carefully.</strong> It explains that
            your landlord intends to seek possession of the property you are
            renting. You should obtain advice from a solicitor or from a Citizens
            Advice Bureau immediately.
          </p>
        </div>

        {/* Section 1 — Tenant details */}
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

        {/* Section 2 — Earliest date */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 2 — Earliest court action date
          </h3>
          <p className="text-foreground">
            The landlord will not be able to apply to the court for an order
            requiring you to leave the property before:
          </p>
          <p className="mt-2 text-xl font-bold text-foreground">
            {formatDateGB(earliestCourtDate)}
          </p>
        </section>

        {/* Section 3 — Latest date */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 3 — Expiry of notice
          </h3>
          <p className="text-foreground">
            You do not have to leave the property in response to this notice.
            After 12 months from the date of service (
            <strong>{formatDateGB(latestDate)}</strong>), the landlord would
            need to serve a new notice if he or she still wished to apply to the
            court for an order.
          </p>
        </section>

        {/* Section 4 — Grounds */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 4 — Grounds for possession
          </h3>

          {/* 4.1 */}
          <div className="mb-4">
            <p className="mb-2 font-medium text-foreground">
              4.1 The landlord seeks to repossess the dwelling-house on the
              following ground(s):
            </p>
            <ul className="list-inside list-disc space-y-1 text-foreground">
              {grounds.map((ground) => (
                <li key={ground.id}>
                  Ground {ground.number} — {ground.name} ({ground.type})
                </li>
              ))}
            </ul>
          </div>

          {/* 4.2 */}
          <div className="mb-4">
            <p className="mb-3 font-medium text-foreground">
              4.2 The full text of the ground(s) for possession:
            </p>
            {grounds.map((ground) => (
              <div
                key={ground.id}
                className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-4 print:border print:border-[#e5e7eb]"
              >
                <p className="mb-2 font-semibold text-foreground">
                  Ground {ground.number} — {ground.name}
                </p>
                <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {ground.legalWording}
                </p>
              </div>
            ))}
          </div>

          {/* 4.3 */}
          <div>
            <p className="mb-3 font-medium text-foreground">
              4.3 The landlord&apos;s reasons for applying for possession:
            </p>
            {grounds.map((ground) => (
              <div key={ground.id} className="mb-4">
                <p className="mb-1 font-semibold text-foreground">
                  Ground {ground.number} — {ground.name}
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 print:border print:border-[#e5e7eb]">
                  <p className="whitespace-pre-wrap text-foreground">
                    {explanations[ground.id] ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 — Landlord contact */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
            Section 5 — Name and address of landlord / agent
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
