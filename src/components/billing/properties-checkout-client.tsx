"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

type Props = { priceId: string };

type CapItem = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const CAPABILITIES: CapItem[] = [
  {
    Icon: Building2,
    title: "Every property. One dashboard.",
    body: "Track occupancy, rent, maintenance, and certificates across your entire portfolio at a glance.",
  },
  {
    Icon: Users,
    title: "Tenants, not spreadsheets.",
    body: "Full tenant records, tenancy dates, deposit tracking, and payment history. Everything you need in one place.",
  },
  {
    Icon: Wrench,
    title: "Maintenance that doesn't slip.",
    body: "Log tickets, assign contractors, track costs, and get alerted when issues go unresolved.",
  },
  {
    Icon: FileText,
    title: "Never miss a certificate.",
    body: "Gas safety, EPC, EICR — Winston tracks expiry dates and alerts you before they lapse.",
  },
];

const FEATURES = [
  "Portfolio dashboard",
  "Tenant management",
  "Maintenance tracking",
  "Rent tracking",
  "Certificate alerts",
  "Document storage",
  "Winston property insights",
];

const AMBER_GRADIENT = "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

function StaggerWords({
  text,
  baseDelay = 0,
  noMotion,
  className,
}: {
  text: string;
  baseDelay?: number;
  noMotion: boolean;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={cn("inline", className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={noMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: noMotion ? 0 : baseDelay + i * 0.08,
            ease: MOTION_EASE.easeOut,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </span>
  );
}

function CapabilityCard({
  Icon,
  title,
  body,
  index,
  noMotion,
}: CapItem & { index: number; noMotion: boolean }) {
  return (
    <motion.div
      initial={noMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.35,
        delay: noMotion ? 0 : index * 0.1,
        ease: MOTION_EASE.easeOut,
      }}
      className="rounded-2xl border border-amber-500/15 bg-card/80 p-6 shadow-sm"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
        <Icon className="size-5 text-amber-500" aria-hidden />
      </div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function CheckoutButton({
  loading,
  disabled,
  onClick,
  label = "Unlock Properties",
  compact = false,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={loading ? "Redirecting to Stripe" : `${label} — secure checkout`}
      className={cn(
        "group relative overflow-hidden rounded-xl text-sm font-semibold text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-opacity hover:opacity-90",
        compact ? "min-h-[44px] px-5 py-2.5" : "w-full min-h-[48px] py-3.5"
      )}
      style={{ background: AMBER_GRADIENT }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 ease-in-out group-hover:translate-x-full"
      />
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {loading ? "Redirecting…" : label}
      </span>
    </button>
  );
}

export function PropertiesCheckoutClient({ priceId }: Props) {
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();
  const noMotion = reduced === true;
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaInView, setCtaInView] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCtaInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleCheckout() {
    if (loading || !priceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error("create-checkout failed:", data.error);
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("create-checkout error:", err);
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to plans
        </Link>
      </div>

      <section
        className="relative -mx-4 mb-12 overflow-hidden md:-mx-6 lg:-mx-8"
        aria-label="WISK Properties hero"
        style={{
          background:
            "linear-gradient(145deg, #0c0a08 0%, #1a1208 40%, #120d08 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(245,158,11,0.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-48 size-96 rounded-full blur-3xl"
          style={{ background: "rgba(245, 158, 11, 0.25)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 size-72 rounded-full blur-3xl"
          style={{ background: "rgba(180, 83, 9, 0.2)" }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-20 lg:px-8">
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: MOTION_EASE.easeOut }}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400"
          >
            WISK Properties
          </motion.p>

          <motion.div
            initial={noMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: MOTION_EASE.easeOut }}
            className="mx-auto mb-8 flex size-20 items-center justify-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(217,119,6,0.4), rgba(245,158,11,0.2))",
              boxShadow:
                "0 0 0 1px rgba(245,158,11,0.3), 0 0 40px rgba(245,158,11,0.25)",
            }}
          >
            <Building2 className="size-9 text-amber-300" aria-hidden />
          </motion.div>

          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
            <motion.span
              className="block text-white"
              initial={noMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: noMotion ? 0 : 0.2,
                ease: MOTION_EASE.easeOut,
              }}
            >
              <StaggerWords text="Your portfolio." noMotion={noMotion} />
            </motion.span>
            <span className="mt-1 block">
              <StaggerWords
                text="Finally under control."
                baseDelay={noMotion ? 0 : 0.35}
                noMotion={noMotion}
                className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent"
              />
            </span>
          </h1>

          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: noMotion ? 0 : 0.75,
              ease: MOTION_EASE.easeOut,
            }}
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
          >
            Manage every property, tenant, and maintenance request in one place.
            Winston monitors your portfolio and alerts you before problems become
            expensive.
          </motion.p>

          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: noMotion ? 0 : 0.9,
              ease: MOTION_EASE.easeOut,
            }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Building2 className="size-3.5 text-amber-400" aria-hidden />
              Built for UK landlords
            </span>
            <span className="hidden text-white/20 sm:block" aria-hidden>
              ·
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Sparkles className="size-3.5 text-amber-400" aria-hidden />
              Winston AI included
            </span>
          </motion.div>
        </div>
      </section>

      <section className="mb-14" aria-label="What Properties includes">
        <motion.p
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: MOTION_EASE.smooth }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Built for landlords
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAPABILITIES.map((cap, i) => (
            <CapabilityCard key={cap.title} {...cap} index={i} noMotion={noMotion} />
          ))}
        </div>
      </section>

      <section className="mx-auto mb-6 max-w-lg" aria-label="WISK Properties pricing">
        <motion.div
          initial={noMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: MOTION_EASE.easeOut }}
          className="rounded-2xl border border-amber-500/25 bg-card/90 p-8 shadow-[0_8px_40px_-8px_rgba(245,158,11,0.2)]"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-amber-500">
                WISK Properties
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  £17
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(245,158,11,0.15))",
                boxShadow: "0 0 0 1px rgba(245,158,11,0.25)",
              }}
            >
              <Building2 className="size-5 text-amber-400" aria-hidden />
            </div>
          </div>

          <p className="mb-6 text-xs text-muted-foreground">
            Billed monthly. Cancel any time.
          </p>

          <ul className="mb-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] text-amber-300"
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}
                  aria-hidden
                >
                  ◆
                </span>
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <div ref={ctaRef}>
            <CheckoutButton
              loading={loading}
              disabled={loading || !priceId}
              onClick={handleCheckout}
            />
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Secure checkout via Stripe
          </p>
        </motion.div>
      </section>

      <AnimatePresence>
        {!ctaInView && (
          <motion.div
            key="sticky-cta"
            initial={noMotion ? { opacity: 0 } : { y: "100%" }}
            animate={noMotion ? { opacity: 1 } : { y: 0 }}
            exit={noMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              noMotion
                ? { duration: 0.15, ease: "easeOut" }
                : { type: "spring", stiffness: 400, damping: 35 }
            }
            className={cn(
              "fixed inset-x-0 z-50",
              "bottom-[calc(3.25rem+env(safe-area-inset-bottom))]",
              "md:bottom-0"
            )}
            aria-label="Quick checkout"
          >
            <div
              className="border-t bg-background/95 backdrop-blur-md"
              style={{ borderTopColor: "rgba(245, 158, 11, 0.4)" }}
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-6 lg:px-8">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    WISK Properties
                  </p>
                  <p className="text-xs text-muted-foreground">£17 / month</p>
                </div>
                <CheckoutButton
                  loading={loading}
                  disabled={loading || !priceId}
                  onClick={handleCheckout}
                  label="Unlock Properties"
                  compact
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
