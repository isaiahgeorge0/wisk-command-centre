"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  FileWarning,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { Section8NoticeDocument } from "@/components/properties/section-8-notice-document";
import { Section13NoticeDocument } from "@/components/properties/section-13-notice-document";
import { DISCLAIMER_TEXT, POSSESSION_GROUNDS } from "@/lib/properties/legal-grounds";
import {
  calculateArrearsStatus,
  calculateEarliestCourtDate,
  calculateForm4ANewRentDate,
  formatDateGB,
  getProtectedUntilDate,
  isWithinProtectedPeriod,
} from "@/lib/properties/notice-calculations";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import type { RentPaymentWithDetails, Tenant } from "@/lib/properties/types";
import {
  formatLandlordAddress,
  hasLandlordAddress,
  type LandlordContact,
} from "@/lib/users/landlord-contact";
import { cn } from "@/lib/utils";

type NoticeType = "section_8" | "section_13";
type WizardStep = "type" | "select" | "review" | "document";

type NoticesPageClientProps = {
  tenants: Array<Tenant & { property_name?: string }>;
  payments: RentPaymentWithDetails[];
  landlordName: string;
  landlordContact: LandlordContact;
};

// ─── Section 8 form state ────────────────────────────────────────────────────

type Section8FormState = {
  tenantId: string;
  selectedGrounds: string[];
  explanations: Record<string, string>;
  noticeServedDate: string;
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
  confirmed: boolean;
};

// ─── Section 13 form state ───────────────────────────────────────────────────

type Section13FormState = {
  tenantId: string;
  proposedRent: string;
  lastIncreaseDate: string;
  noticeServedDate: string;
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
  confirmed: boolean;
};

// ─── Disclaimer box ──────────────────────────────────────────────────────────

function DisclaimerBox() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-500"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Legal disclaimer — please read
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700/80 dark:text-amber-400/80">
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </div>
    </div>
  );
}

type LandlordDetailsFieldsProps = {
  name: string;
  address: string;
  phone: string;
  showSettingsHint: boolean;
  addressPlaceholder?: string;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

function LandlordDetailsFields({
  name,
  address,
  phone,
  showSettingsHint,
  addressPlaceholder = "Full postal address for service of proceedings",
  onNameChange,
  onAddressChange,
  onPhoneChange,
}: LandlordDetailsFieldsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Landlord / agent details</p>
      <div>
        <label className="block text-xs text-muted-foreground">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Address</label>
        <textarea
          rows={3}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={addressPlaceholder}
          className="mt-1 w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
        />
        {showSettingsHint ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Add your address in{" "}
            <Link
              href="/settings"
              className="font-medium text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400"
            >
              Settings
            </Link>{" "}
            to pre-fill this automatically next time.
          </p>
        ) : null}
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">
          Phone number (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
        />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NoticesPageClient({
  tenants,
  payments,
  landlordName: initialLandlordName,
  landlordContact,
}: NoticesPageClientProps) {
  const initialLandlordAddress = formatLandlordAddress(landlordContact);
  const initialLandlordPhone = landlordContact.phone?.trim() ?? "";
  const showSettingsHint = !hasLandlordAddress(landlordContact);

  const [noticeType, setNoticeType] = useState<NoticeType | null>(null);
  const [step, setStep] = useState<WizardStep>("type");

  const today = new Date().toISOString().slice(0, 10);

  const [s8Form, setS8Form] = useState<Section8FormState>({
    tenantId: "",
    selectedGrounds: [],
    explanations: {},
    noticeServedDate: today,
    landlordName: initialLandlordName,
    landlordAddress: initialLandlordAddress,
    landlordPhone: initialLandlordPhone,
    confirmed: false,
  });

  const [s13Form, setS13Form] = useState<Section13FormState>({
    tenantId: "",
    proposedRent: "",
    lastIncreaseDate: "",
    noticeServedDate: today,
    landlordName: initialLandlordName,
    landlordAddress: initialLandlordAddress,
    landlordPhone: initialLandlordPhone,
    confirmed: false,
  });

  // ── Derived: selected tenant ──────────────────────────────────────────────

  const selectedS8Tenant = useMemo(
    () => tenants.find((t) => t.id === s8Form.tenantId) ?? null,
    [tenants, s8Form.tenantId]
  );

  const selectedS13Tenant = useMemo(
    () => tenants.find((t) => t.id === s13Form.tenantId) ?? null,
    [tenants, s13Form.tenantId]
  );

  // ── Derived: arrears status ───────────────────────────────────────────────

  const arrearsStatus = useMemo(() => {
    if (!selectedS8Tenant) return null;
    const tenantPayments = payments.filter(
      (p) => p.tenant_id === selectedS8Tenant.id
    );
    return calculateArrearsStatus(
      tenantPayments,
      selectedS8Tenant.rent_frequency === "weekly" ? "weekly" : "monthly",
      selectedS8Tenant.rent_amount,
      new Date()
    );
  }, [selectedS8Tenant, payments]);

  // ── Derived: Form 4A date ─────────────────────────────────────────────────

  const form4ADateResult = useMemo(() => {
    if (!selectedS13Tenant || !s13Form.proposedRent) return null;
    const tenancyStart = new Date(selectedS13Tenant.tenancy_start);
    const lastIncrease = s13Form.lastIncreaseDate
      ? new Date(s13Form.lastIncreaseDate)
      : null;
    const noticeServed = new Date(s13Form.noticeServedDate);
    return calculateForm4ANewRentDate(tenancyStart, lastIncrease, noticeServed);
  }, [selectedS13Tenant, s13Form.lastIncreaseDate, s13Form.noticeServedDate, s13Form.proposedRent]);

  // ── Derived: Section 8 court date ────────────────────────────────────────

  const earliestCourtDate = useMemo(() => {
    if (s8Form.selectedGrounds.length === 0) return null;
    return calculateEarliestCourtDate(
      s8Form.selectedGrounds,
      new Date(s8Form.noticeServedDate)
    );
  }, [s8Form.selectedGrounds, s8Form.noticeServedDate]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const toggleGround = (groundId: string) => {
    setS8Form((prev) => {
      const exists = prev.selectedGrounds.includes(groundId);
      const selectedGrounds = exists
        ? prev.selectedGrounds.filter((id) => id !== groundId)
        : [...prev.selectedGrounds, groundId];
      const explanations = { ...prev.explanations };
      if (exists) delete explanations[groundId];
      return { ...prev, selectedGrounds, explanations };
    });
  };

  const setExplanation = (groundId: string, text: string) => {
    setS8Form((prev) => ({
      ...prev,
      explanations: { ...prev.explanations, [groundId]: text },
    }));
  };

  const allExplanationsFilled = s8Form.selectedGrounds.every(
    (id) => (s8Form.explanations[id] ?? "").trim().length > 0
  );

  // ── STEP: Type selection ──────────────────────────────────────────────────

  if (step === "type") {
    return (
      <PageTransition>
        <PageHeader
          title="Legal Notices"
          subtitle="Prepare official Section 8 and Section 13 notices using your account data."
          icon={
            <FileWarning
              className="size-6"
              style={{ color: PROPERTIES_ACCENT }}
            />
          }
          className="mb-8"
        />
        <DisclaimerBox />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setNoticeType("section_8");
              setStep("select");
            }}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-6 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
          >
            <FileWarning className="size-7 text-amber-500" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">
                Section 8 — Notice seeking possession
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                For rent arrears, breach of tenancy, or other grounds to end a
                tenancy. Uses Form 3A.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setNoticeType("section_13");
              setStep("select");
            }}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-6 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
          >
            <TrendingUp className="size-7 text-amber-500" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">
                Section 13 — Rent increase notice
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Propose a new rent to your tenant with the correct legal notice
                period. Uses Form 4A.
              </p>
            </div>
          </button>
        </div>
      </PageTransition>
    );
  }

  // ── STEP: Section 8 — Select tenant & grounds ─────────────────────────────

  if (step === "select" && noticeType === "section_8") {
    const mandatoryGrounds = POSSESSION_GROUNDS.filter(
      (g) => g.type === "mandatory"
    );
    const discretionaryGrounds = POSSESSION_GROUNDS.filter(
      (g) => g.type === "discretionary"
    );

    const noticeServedDateObj = new Date(s8Form.noticeServedDate);

    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => setStep("type")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <h2 className="mb-6 text-lg font-semibold text-foreground">
          Section 8 — Select tenant and grounds
        </h2>

        <DisclaimerBox />

        <div className="mt-6 space-y-6">
          {/* Tenant selector */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              Tenant
            </label>
            <select
              value={s8Form.tenantId}
              onChange={(e) =>
                setS8Form((prev) => ({
                  ...prev,
                  tenantId: e.target.value,
                  selectedGrounds: [],
                  explanations: {},
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a tenant…</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                  {tenant.property_name ? ` — ${tenant.property_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Notice served date */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              Date notice will be served
            </label>
            <input
              type="date"
              value={s8Form.noticeServedDate}
              onChange={(e) =>
                setS8Form((prev) => ({
                  ...prev,
                  noticeServedDate: e.target.value,
                }))
              }
              className="mt-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Arrears summary */}
          {arrearsStatus && (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <p className="text-sm font-medium text-foreground">
                Current arrears (from payment records)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                £{arrearsStatus.totalArrears.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ≈ {arrearsStatus.monthsEquivalent} months equivalent
              </p>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Note: arrears caused by Universal Credit payment delays are
                excluded from the Ground 8 threshold under current law but
                cannot be detected automatically from your payment records.
                Please verify manually.
              </p>
            </div>
          )}

          {/* Grounds selection */}
          {s8Form.tenantId ? (
            <div className="space-y-6">
              {/* Mandatory grounds */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mandatory grounds
                </p>
                <div className="space-y-3">
                  {mandatoryGrounds.map((ground) => {
                    const protectedUntil = getProtectedUntilDate(
                      ground.id,
                      new Date(selectedS8Tenant!.tenancy_start)
                    );
                    const isProtected = isWithinProtectedPeriod(
                      ground.id,
                      new Date(selectedS8Tenant!.tenancy_start),
                      noticeServedDateObj
                    );
                    const isGround8Disabled =
                      ground.id === "ground_8" &&
                      arrearsStatus != null &&
                      !arrearsStatus.meetsGround8Threshold;

                    const isDisabled = isProtected || isGround8Disabled;

                    return (
                      <div
                        key={ground.id}
                        className={cn(
                          "rounded-xl border p-4",
                          isDisabled
                            ? "border-border/40 bg-muted/30 opacity-70"
                            : "border-border/60 bg-card/60"
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={s8Form.selectedGrounds.includes(ground.id)}
                            disabled={isDisabled}
                            onChange={() => toggleGround(ground.id)}
                            className="mt-0.5 size-4 accent-amber-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Ground {ground.number} — {ground.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {ground.explanation}
                            </p>
                            {isProtected && protectedUntil ? (
                              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                                This tenancy began less than 12 months ago.
                                Grounds 1 and 1A cannot be used until{" "}
                                {formatDateGB(protectedUntil)}.
                              </p>
                            ) : null}
                            {isGround8Disabled ? (
                              <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                                Arrears do not currently meet the 3-month
                                threshold required for Ground 8 (mandatory). You
                                may still select Ground 10 or 11
                                (discretionary).
                              </p>
                            ) : null}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discretionary grounds */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Discretionary grounds
                </p>
                <div className="space-y-3">
                  {discretionaryGrounds.map((ground) => (
                    <div
                      key={ground.id}
                      className="rounded-xl border border-border/60 bg-card/60 p-4"
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={s8Form.selectedGrounds.includes(ground.id)}
                          onChange={() => toggleGround(ground.id)}
                          className="mt-0.5 size-4 accent-amber-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Ground {ground.number} — {ground.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ground.explanation}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {s8Form.selectedGrounds.length > 0 && earliestCourtDate ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
              <Calendar className="size-4 text-muted-foreground" aria-hidden />
              <p className="text-sm text-foreground">
                Earliest court date:{" "}
                <span className="font-semibold">
                  {formatDateGB(earliestCourtDate)}
                </span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={s8Form.selectedGrounds.length === 0 || !s8Form.tenantId}
            onClick={() => setStep("review")}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </PageTransition>
    );
  }

  // ── STEP: Section 8 — Review & generate ──────────────────────────────────

  if (step === "review" && noticeType === "section_8" && selectedS8Tenant) {
    const maxNoticeWeeks = Math.max(
      ...s8Form.selectedGrounds.map(
        (id) =>
          POSSESSION_GROUNDS.find((g) => g.id === id)?.noticePeriodWeeks ?? 0
      )
    );

    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => setStep("select")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <h2 className="mb-6 text-lg font-semibold text-foreground">
          Section 8 — Review and generate
        </h2>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm">
            <p className="text-muted-foreground">Tenant</p>
            <p className="mt-0.5 font-medium text-foreground">
              {selectedS8Tenant.first_name} {selectedS8Tenant.last_name}
            </p>
            <p className="mt-3 text-muted-foreground">Notice period</p>
            <p className="mt-0.5 font-medium text-foreground">
              {maxNoticeWeeks} weeks
            </p>
            {earliestCourtDate ? (
              <>
                <p className="mt-3 text-muted-foreground">
                  Earliest court date
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatDateGB(earliestCourtDate)}
                </p>
              </>
            ) : null}
          </div>

          {/* Landlord contact details */}
          <LandlordDetailsFields
            name={s8Form.landlordName}
            address={s8Form.landlordAddress}
            phone={s8Form.landlordPhone}
            showSettingsHint={showSettingsHint}
            onNameChange={(value) =>
              setS8Form((prev) => ({ ...prev, landlordName: value }))
            }
            onAddressChange={(value) =>
              setS8Form((prev) => ({ ...prev, landlordAddress: value }))
            }
            onPhoneChange={(value) =>
              setS8Form((prev) => ({ ...prev, landlordPhone: value }))
            }
          />

          {/* Explanations per ground */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Question 4.3 — Your explanation (required)
            </p>
            <p className="text-xs text-muted-foreground">
              You must explain in your own words why you believe you can use
              each ground. This section is never pre-filled by WISK.
            </p>
            {s8Form.selectedGrounds.map((groundId) => {
              const ground = POSSESSION_GROUNDS.find(
                (g) => g.id === groundId
              )!;
              return (
                <div key={groundId} className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Ground {ground.number} — {ground.name}
                  </label>
                  <textarea
                    rows={4}
                    value={s8Form.explanations[groundId] ?? ""}
                    onChange={(e) => setExplanation(groundId, e.target.value)}
                    placeholder="Explain in your own words why you believe you can use this ground. Include as much evidence as possible."
                    className="w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              );
            })}
          </div>

          <DisclaimerBox />

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={s8Form.confirmed}
              onChange={(e) =>
                setS8Form((prev) => ({ ...prev, confirmed: e.target.checked }))
              }
              className="mt-0.5 size-4 accent-amber-500"
            />
            <span className="text-sm text-foreground">
              I have read and understood the above. I confirm I am responsible
              for the accuracy of this notice.
            </span>
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={
              !s8Form.confirmed ||
              !allExplanationsFilled ||
              !s8Form.landlordAddress.trim()
            }
            onClick={() => setStep("document")}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate notice
          </button>
        </div>
      </PageTransition>
    );
  }

  // ── STEP: Section 13 — Select tenant & propose rent ──────────────────────

  if (step === "select" && noticeType === "section_13") {
    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => setStep("type")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <h2 className="mb-6 text-lg font-semibold text-foreground">
          Section 13 — Select tenant and propose rent
        </h2>

        <DisclaimerBox />

        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Tenant
            </label>
            <select
              value={s13Form.tenantId}
              onChange={(e) =>
                setS13Form((prev) => ({ ...prev, tenantId: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a tenant…</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                  {tenant.property_name ? ` — ${tenant.property_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedS13Tenant ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm">
              <p className="text-muted-foreground">Current rent</p>
              <p className="mt-0.5 font-medium text-foreground">
                £{selectedS13Tenant.rent_amount}/{selectedS13Tenant.rent_frequency}
              </p>
              <p className="mt-2 text-muted-foreground">Tenancy started</p>
              <p className="mt-0.5 font-medium text-foreground">
                {formatDateGB(new Date(selectedS13Tenant.tenancy_start))}
              </p>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-foreground">
              Proposed new rent (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={s13Form.proposedRent}
              onChange={(e) =>
                setS13Form((prev) => ({
                  ...prev,
                  proposedRent: e.target.value,
                }))
              }
              className="mt-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Date notice will be served
            </label>
            <input
              type="date"
              value={s13Form.noticeServedDate}
              onChange={(e) =>
                setS13Form((prev) => ({
                  ...prev,
                  noticeServedDate: e.target.value,
                }))
              }
              className="mt-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Date of last rent increase (optional)
            </label>
            <input
              type="date"
              value={s13Form.lastIncreaseDate}
              onChange={(e) =>
                setS13Form((prev) => ({
                  ...prev,
                  lastIncreaseDate: e.target.value,
                }))
              }
              className="mt-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
            />
          </div>

          {form4ADateResult ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Earliest possible new rent date:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatDateGB(form4ADateResult.earliestStartDate)}
                  </span>
                </p>
              </div>
              {form4ADateResult.warning ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {form4ADateResult.warning}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={
              !s13Form.tenantId ||
              !s13Form.proposedRent ||
              !form4ADateResult
            }
            onClick={() => setStep("review")}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </PageTransition>
    );
  }

  // ── STEP: Section 13 — Review & generate ─────────────────────────────────

  if (step === "review" && noticeType === "section_13" && selectedS13Tenant) {
    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => setStep("select")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <h2 className="mb-6 text-lg font-semibold text-foreground">
          Section 13 — Review and generate
        </h2>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm space-y-3">
            <div>
              <p className="text-muted-foreground">Tenant</p>
              <p className="mt-0.5 font-medium text-foreground">
                {selectedS13Tenant.first_name} {selectedS13Tenant.last_name}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current rent</p>
              <p className="mt-0.5 font-medium text-foreground">
                £{selectedS13Tenant.rent_amount}/{selectedS13Tenant.rent_frequency}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Proposed new rent</p>
              <p className="mt-0.5 font-medium text-foreground">
                £{s13Form.proposedRent}/{selectedS13Tenant.rent_frequency}
              </p>
            </div>
            {form4ADateResult ? (
              <div>
                <p className="text-muted-foreground">New rent start date</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatDateGB(form4ADateResult.earliestStartDate)}
                </p>
                {form4ADateResult.warning ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {form4ADateResult.warning}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Landlord contact details */}
          <LandlordDetailsFields
            name={s13Form.landlordName}
            address={s13Form.landlordAddress}
            phone={s13Form.landlordPhone}
            showSettingsHint={showSettingsHint}
            addressPlaceholder="Full postal address"
            onNameChange={(value) =>
              setS13Form((prev) => ({ ...prev, landlordName: value }))
            }
            onAddressChange={(value) =>
              setS13Form((prev) => ({ ...prev, landlordAddress: value }))
            }
            onPhoneChange={(value) =>
              setS13Form((prev) => ({ ...prev, landlordPhone: value }))
            }
          />

          <DisclaimerBox />

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={s13Form.confirmed}
              onChange={(e) =>
                setS13Form((prev) => ({
                  ...prev,
                  confirmed: e.target.checked,
                }))
              }
              className="mt-0.5 size-4 accent-amber-500"
            />
            <span className="text-sm text-foreground">
              I have read and understood the above. I confirm I am responsible
              for the accuracy of this notice.
            </span>
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={
              !s13Form.confirmed || !s13Form.landlordAddress.trim()
            }
            onClick={() => setStep("document")}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate notice
          </button>
        </div>
      </PageTransition>
    );
  }

  // ── STEP: Document view ───────────────────────────────────────────────────

  if (step === "document") {
    return (
      <PageTransition>
        <button
          type="button"
          onClick={() => setStep("review")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
        >
          <ChevronLeft className="size-4" />
          Back to review
        </button>

        {noticeType === "section_8" && selectedS8Tenant && earliestCourtDate ? (
          <Section8NoticeDocument
            tenant={selectedS8Tenant}
            selectedGrounds={s8Form.selectedGrounds}
            explanations={s8Form.explanations}
            noticeServedDate={new Date(s8Form.noticeServedDate)}
            earliestCourtDate={earliestCourtDate}
            landlordName={s8Form.landlordName}
            landlordAddress={s8Form.landlordAddress}
            landlordPhone={s8Form.landlordPhone}
          />
        ) : noticeType === "section_13" &&
          selectedS13Tenant &&
          form4ADateResult ? (
          <Section13NoticeDocument
            tenant={selectedS13Tenant}
            proposedRent={Number(s13Form.proposedRent)}
            newRentStartDate={form4ADateResult.earliestStartDate}
            noticeServedDate={new Date(s13Form.noticeServedDate)}
            lastIncreaseDate={
              s13Form.lastIncreaseDate
                ? new Date(s13Form.lastIncreaseDate)
                : null
            }
            landlordName={s13Form.landlordName}
            landlordAddress={s13Form.landlordAddress}
            landlordPhone={s13Form.landlordPhone}
          />
        ) : null}
      </PageTransition>
    );
  }

  return null;
}
