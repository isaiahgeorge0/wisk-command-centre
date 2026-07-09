"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  Sparkles,
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
    Icon: Scale,
    title: "Tax-ready reporting.",
    body: "SA105 tax summaries and financial reports built for UK landlords — no spreadsheet wrangling at year end.",
  },
  {
    Icon: FileText,
    title: "Legal notice templates.",
    body: "Section 8 notice templates ready when you need them. Section 21 is gone — stay compliant with the right paperwork.",
  },
  {
    Icon: Sparkles,
    title: "Winston Pro insights.",
    body: "Deeper portfolio intelligence: yield analytics, tenant reliability scoring, and proactive recommendations.",
  },
  {
    Icon: BarChart3,
    title: "Everything in Properties.",
    body: "Full portfolio dashboard, tenants, maintenance, rent tracking, certificates, and contractor portal — all included.",
  },
];

const FEATURES = [
  "Everything in WISK Properties",
  "SA105 tax summary",
  "Legal notice templates (Section 8)",
  "Winston Pro property insights",
  "Yield analytics",
  "Tenant reliability scoring",
  "Financial reports",
];

const AMBER_GRADIENT =
  "linear-gradient(135deg, #8b0010 0%, #e8001d 50%, #cc0016 100%)";

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
      className="rounded-2xl border border-wisk-ferrari/15 bg-card/80 p-6 shadow-sm"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-wisk-ferrari/20 bg-wisk-ferrari/10">
        <Icon className="size-5 text-wisk-ferrari" aria-hidden />
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
  label = "Unlock Properties Pro",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wisk-ferrari focus-visible:ring-offset-2",
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

export function PropertiesProCheckoutClient({ priceId }: Props) {
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
        aria-label="WISK Properties Pro hero"
        style={{
          background:
            "linear-gradient(145deg, #0a0806 0%, #1a0f06 40%, #140a06 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(232,0,29,0.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-48 size-96 rounded-full blur-3xl"
          style={{ background: "rgba(217, 119, 6, 0.28)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 size-72 rounded-full blur-3xl"
          style={{ background: "rgba(146, 64, 14, 0.25)" }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-20 lg:px-8">
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: MOTION_EASE.easeOut }}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-wisk-ferrari"
          >
            WISK Properties Pro
          </motion.p>

          <motion.div
            initial={noMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: MOTION_EASE.easeOut }}
            className="mx-auto mb-8 flex size-20 items-center justify-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,0,16,0.45), rgba(232,0,29,0.25))",
              boxShadow:
                "0 0 0 1px rgba(232,0,29,0.35), 0 0 40px rgba(232,0,29,0.28)",
            }}
          >
            <Building2 className="size-9 text-wisk-ferrari" aria-hidden />
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
              <StaggerWords text="Landlord Pro." noMotion={noMotion} />
            </motion.span>
            <span className="mt-1 block">
              <StaggerWords
                text="Built for serious portfolios."
                baseDelay={noMotion ? 0 : 0.35}
                noMotion={noMotion}
                className="text-wisk-ferrari"
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
            Everything in WISK Properties, plus tax summaries, legal templates,
            yield analytics, and Winston Pro insights for landlords who want the
            full picture.
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
              <Building2 className="size-3.5 text-wisk-ferrari" aria-hidden />
              Built for UK landlords
            </span>
            <span className="hidden text-white/20 sm:block" aria-hidden>
              ·
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Sparkles className="size-3.5 text-wisk-ferrari" aria-hidden />
              Winston Pro included
            </span>
          </motion.div>
        </div>
      </section>

      <section className="mb-14" aria-label="What Properties Pro includes">
        <motion.p
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: MOTION_EASE.smooth }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Pro landlord tools
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAPABILITIES.map((cap, i) => (
            <CapabilityCard key={cap.title} {...cap} index={i} noMotion={noMotion} />
          ))}
        </div>
      </section>

      <section
        className="mx-auto mb-6 max-w-lg"
        aria-label="WISK Properties Pro pricing"
      >
        <motion.div
          initial={noMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: MOTION_EASE.easeOut }}
          className="rounded-2xl border border-wisk-ferrari/20 bg-card/90 p-8 shadow-[0_8px_40px_-8px_rgba(232,0,29,0.2)]"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-wisk-ferrari">
                WISK Properties Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  £32
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,0,16,0.35), rgba(232,0,29,0.18))",
                boxShadow: "0 0 0 1px rgba(232,0,29,0.3)",
              }}
            >
              <Building2 className="size-5 text-wisk-ferrari" aria-hidden />
            </div>
          </div>

          <p className="mb-6 text-xs text-muted-foreground">
            Billed monthly. Cancel any time.
          </p>

          <ul className="mb-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] text-wisk-ferrari"
                  style={{
                    background: "rgba(232,0,29,0.15)",
                    border: "1px solid rgba(232,0,29,0.3)",
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
              style={{ borderTopColor: "rgba(217, 119, 6, 0.45)" }}
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-6 lg:px-8">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    WISK Properties Pro
                  </p>
                  <p className="text-xs text-muted-foreground">£32 / month</p>
                </div>
                <CheckoutButton
                  loading={loading}
                  disabled={loading || !priceId}
                  onClick={handleCheckout}
                  label="Unlock Properties Pro"
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
