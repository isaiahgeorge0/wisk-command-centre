"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Building2, Mail, Sparkles, X } from "lucide-react";
import Link from "next/link";

import { PageTransition } from "@/components/layout/page-transition";
import { buttonVariants } from "@/components/ui/button";
import type { BillingPlan } from "@/lib/billing/types";
import { MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpgradePageClientProps = {
  plan: BillingPlan;
  planLabel: string;
  currentPeriodEnd: string | null;
  hasPropertiesSubscription: boolean;
  hasPropertiesProSubscription: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Plan card data ───────────────────────────────────────────────────────────

const AI_FEATURES = [
  "AI Digest — weekly business summary",
  "WISK Chat — ask Winston anything",
  "Smart suggestions across your workspace",
  "100,000 tokens per month",
];

const AI_PRO_FEATURES = [
  "Everything in WISK AI",
  "Email integration (Gmail + Outlook)",
  "Higher usage limits",
  "Priority support",
];

const PROPERTIES_PRO_FEATURES = [
  "Everything in WISK Properties",
  "SA105 tax summary",
  "Legal notice templates (Section 8)",
  "Winston Pro property insights",
  "Yield analytics",
  "Tenant reliability scoring",
  "Financial reports",
];

const PROPERTIES_PRO_GRADIENT =
  "linear-gradient(135deg, #92400e 0%, #d97706 50%, #ea580c 100%)";

const PROPERTIES_FEATURES = [
  "Portfolio dashboard",
  "Tenant management",
  "Maintenance tracking",
  "Rent tracking",
  "Certificate alerts",
  "Document storage",
  "Winston property insights",
];

function UpgradeToProLink({
  href,
  gradient,
}: {
  href: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[48px]"
      style={{ background: gradient }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 ease-in-out group-hover:translate-x-full"
      />
      <span className="relative flex items-center justify-center">
        Upgrade to Pro
      </span>
    </Link>
  );
}

// ─── Shared CTA link (for unsubscribed state) ─────────────────────────────────

function GetStartedLink({
  href,
  gradient,
}: {
  href: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[48px]"
      style={{ background: gradient }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 ease-in-out group-hover:translate-x-full"
      />
      <span className="relative flex items-center justify-center">Get started</span>
    </Link>
  );
}

// ─── Manage subscription button (for subscribed state) ────────────────────────

function ManageButton({
  onClick,
  loading,
  accentColor,
}: {
  onClick: () => void;
  loading: boolean;
  accentColor: "purple" | "teal" | "amber";
}) {
  const styles =
    accentColor === "purple"
      ? "border-purple-500/30 bg-purple-500/8 text-purple-400 hover:bg-purple-500/15"
      : accentColor === "teal"
        ? "border-teal-500/30 bg-teal-500/8 text-teal-400 hover:bg-teal-500/15"
        : "border-amber-600/30 bg-amber-600/8 text-amber-500 hover:bg-amber-600/15";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-medium transition-colors disabled:opacity-50 min-h-[48px]",
        styles
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Manage subscription
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UpgradePageClient({
  plan,
  planLabel,
  currentPeriodEnd,
  hasPropertiesSubscription,
  hasPropertiesProSubscription,
}: UpgradePageClientProps) {
  const searchParams = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const noMotion = reduced === true;

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") setShowCancelled(true);
  }, [searchParams]);

  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const hasActivePlan =
    plan !== "free" ||
    hasPropertiesSubscription ||
    hasPropertiesProSubscription;

  async function openPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("customer-portal failed:", data.error);
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("customer-portal error:", err);
      setPortalLoading(false);
    }
  }

  return (
    <PageTransition>
      {/* ── Cancelled banner ──────────────────────────────────────────────────── */}
      {showCancelled && (
        <div
          ref={bannerRef}
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <p className="flex-1 text-muted-foreground">
            No worries — you can upgrade any time.
          </p>
          <button
            onClick={() => setShowCancelled(false)}
            className="shrink-0 text-muted-foreground/60 transition-opacity hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* ── Section 1: Hero ───────────────────────────────────────────────────── */}
      <section
        className="-mx-4 mb-12 overflow-hidden md:-mx-6 lg:-mx-8"
        aria-label="Plan selection hero"
        style={{
          background:
            "linear-gradient(145deg, #07040f 0%, #080c16 50%, #040d0d 100%)",
        }}
      >
        {/* Dot-grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient orbs — purple left, teal right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 size-80 rounded-full blur-3xl"
          style={{ background: "rgba(109, 40, 217, 0.28)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -right-20 size-72 rounded-full blur-3xl"
          style={{ background: "rgba(20, 184, 166, 0.2)" }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16 text-center md:px-6 md:py-20 lg:px-8">
          {/* Eyebrow */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: MOTION_EASE.easeOut }}
            className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40"
          >
            Choose your plan
          </motion.p>

          {/* Headline */}
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            <motion.span
              className="block"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #c084fc, #a855f7 40%, #14b8a6)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
              initial={noMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: noMotion ? 0 : 0.15,
                ease: MOTION_EASE.easeOut,
              }}
            >
              Invest in
            </motion.span>

            <span className="block text-white">
              {["your", "business."].map((word, i) => (
                <motion.span
                  key={word}
                  className="inline-block"
                  initial={noMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: noMotion ? 0 : 0.35 + i * 0.08,
                    ease: MOTION_EASE.easeOut,
                  }}
                >
                  {word}
                  {i === 0 ? "\u00a0" : ""}
                </motion.span>
              ))}
            </span>
          </h1>

          {/* Subheading */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: noMotion ? 0 : 0.55, ease: MOTION_EASE.easeOut }}
            className="text-base leading-relaxed text-white/60 md:text-lg"
          >
            WISK core is free. Add Winston and AI-powered insights when you&apos;re ready to go deeper.
          </motion.p>
        </div>
      </section>

      {/* ── Section 2: Pricing cards ──────────────────────────────────────────── */}
      <section className="mb-8" aria-label="Pricing plans">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {plan !== "ai_pro" && plan !== "max" ? (
            <motion.div
              initial={noMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: MOTION_EASE.easeOut }}
              whileHover={{ scale: 1.01 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-purple-500/20 bg-card/90 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.12)] transition-shadow hover:border-purple-500/40 hover:shadow-[0_8px_40px_-8px_rgba(168,85,247,0.3)]"
            >
              <div
                aria-hidden
                className="h-1 w-full shrink-0"
                style={{
                  background:
                    "linear-gradient(to right, #5b21b6, #a855f7, #7c3aed)",
                }}
              />

              <div className="px-6 pt-6 pb-4">
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{
                      background: "rgba(168,85,247,0.15)",
                      border: "1px solid rgba(168,85,247,0.25)",
                    }}
                  >
                    <Sparkles className="size-4 text-purple-400" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-purple-400">WISK AI</p>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    £9
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed monthly. Cancel any time.
                </p>
              </div>

              <div className="flex-1 px-6 pb-5">
                <ul className="space-y-2.5">
                  {AI_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: "#a855f7" }}
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 pb-6">
                {plan === "ai" ? (
                  <ManageButton
                    onClick={openPortal}
                    loading={portalLoading}
                    accentColor="purple"
                  />
                ) : (
                  <GetStartedLink
                    href="/upgrade/ai"
                    gradient="linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #14b8a6 100%)"
                  />
                )}
              </div>
            </motion.div>
          ) : null}

          {/* ── WISK AI Pro ─────────────────────────────────────────────────── */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: noMotion ? 0 : 0.1,
              ease: MOTION_EASE.easeOut,
            }}
            whileHover={{ scale: 1.01 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-teal-500/20 bg-card/90 shadow-[0_4px_24px_-4px_rgba(20,184,166,0.1)] transition-shadow hover:border-teal-500/40 hover:shadow-[0_8px_40px_-8px_rgba(20,184,166,0.25)]"
          >
            {/* Accent bar */}
            <div
              aria-hidden
              className="h-1 w-full shrink-0"
              style={{
                background:
                  "linear-gradient(to right, #0f766e, #14b8a6, #22d3ee)",
              }}
            />

            {/* "Most powerful" badge */}
            {!hasActivePlan && (
              <span
                className="absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300"
                style={{
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.3)",
                }}
              >
                Most powerful
              </span>
            )}

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="mb-1 flex items-center gap-2">
                <div
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{
                    background: "rgba(20,184,166,0.12)",
                    border: "1px solid rgba(20,184,166,0.25)",
                  }}
                >
                  <Mail className="size-4 text-teal-400" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-teal-400">WISK AI Pro</p>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  £19
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Billed monthly. Cancel any time.
              </p>
            </div>

            {/* Features */}
            <div className="flex-1 px-6 pb-5">
              <ul className="space-y-2.5">
                {AI_PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: "#14b8a6" }}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-6 pb-6">
              {plan === "ai_pro" || plan === "max" ? (
                <ManageButton
                  onClick={openPortal}
                  loading={portalLoading}
                  accentColor="teal"
                />
              ) : (
                <GetStartedLink
                  href="/upgrade/ai-pro"
                  gradient="linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #22d3ee 100%)"
                />
              )}
            </div>
          </motion.div>

          {!hasPropertiesSubscription && !hasPropertiesProSubscription ? (
            <motion.div
              initial={noMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: noMotion ? 0 : 0.2,
                ease: MOTION_EASE.easeOut,
              }}
              whileHover={{ scale: 1.01 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-card/90 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.12)] transition-shadow hover:border-amber-500/40 hover:shadow-[0_8px_40px_-8px_rgba(245,158,11,0.25)]"
            >
              <div
                aria-hidden
                className="h-1 w-full shrink-0"
                style={{
                  background:
                    "linear-gradient(to right, #b45309, #f59e0b, #f97316)",
                }}
              />

              <div className="px-6 pt-6 pb-4">
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    <Building2 className="size-4 text-amber-400" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-amber-400">
                    WISK Properties
                  </p>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    £17
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed monthly. Cancel any time.
                </p>
              </div>

              <div className="flex-1 px-6 pb-5">
                <ul className="space-y-2.5">
                  {PROPERTIES_FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: "#f59e0b" }}
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 pb-6">
                <GetStartedLink
                  href="/upgrade/properties"
                  gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)"
                />
              </div>
            </motion.div>
          ) : null}

          {hasPropertiesSubscription || hasPropertiesProSubscription ? (
            <motion.div
              initial={noMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: noMotion ? 0 : 0.2,
                ease: MOTION_EASE.easeOut,
              }}
              whileHover={{ scale: 1.01 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-600/25 bg-card/90 shadow-[0_4px_24px_-4px_rgba(217,119,6,0.14)] transition-shadow hover:border-amber-600/45 hover:shadow-[0_8px_40px_-8px_rgba(217,119,6,0.28)]"
            >
              <span
                className="absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400"
                style={{
                  background: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(217,119,6,0.35)",
                }}
              >
                Landlord Pro
              </span>

              <div
                aria-hidden
                className="h-1 w-full shrink-0"
                style={{
                  background:
                    "linear-gradient(to right, #92400e, #d97706, #ea580c)",
                }}
              />

              <div className="px-6 pt-6 pb-4">
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{
                      background: "rgba(217,119,6,0.12)",
                      border: "1px solid rgba(217,119,6,0.3)",
                    }}
                  >
                    <Building2 className="size-4 text-amber-500" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-amber-500">
                    WISK Properties Pro
                  </p>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    £32
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed monthly. Cancel any time.
                </p>
              </div>

              <div className="flex-1 px-6 pb-5">
                <ul className="space-y-2.5">
                  {PROPERTIES_PRO_FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: "#d97706" }}
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 pb-6">
                {hasPropertiesProSubscription ? (
                  <ManageButton
                    onClick={openPortal}
                    loading={portalLoading}
                    accentColor="amber"
                  />
                ) : (
                  <UpgradeToProLink
                    href="/upgrade/properties-pro"
                    gradient={PROPERTIES_PRO_GRADIENT}
                  />
                )}
              </div>
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* ── Section 3: Current plan ────────────────────────────────────────────── */}
      <motion.section
        initial={noMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: MOTION_EASE.easeOut }}
        aria-label="Current plan"
        className="rounded-2xl border border-border/40 bg-card/50 px-6 py-5"
      >
        <p className="mb-1.5 text-sm font-medium text-foreground">
          Your current plan
        </p>
        {plan === "free" ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re on the free Core plan.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;re on {planLabel}.
          </p>
        )}
        {periodEndLabel && (
          <p className="mt-1 text-sm text-muted-foreground">
            Current period ends {periodEndLabel}.
          </p>
        )}
        {hasActivePlan && (
          <p className="mt-3">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-teal-500 hover:text-teal-400"
              )}
            >
              {portalLoading && (
                <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
              )}
              Manage billing
            </button>
          </p>
        )}
        {!hasActivePlan && (
          <p className="mt-2 text-xs text-muted-foreground">
            Secure checkout via Stripe.{" "}
            <Link
              href="/settings?tab=preferences"
              className="text-teal-500 hover:underline"
            >
              Manage in Settings
            </Link>
          </p>
        )}
      </motion.section>
    </PageTransition>
  );
}
