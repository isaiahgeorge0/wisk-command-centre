"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
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
    Icon: Users,
    title: "Lead intelligence briefs.",
    body: "Before a call, Winston pulls cited company background, budget signals, and pain points from live search.",
  },
  {
    Icon: Radar,
    title: "Competitor watchlist.",
    body: "Track competitor sites and Google Places activity. Meaningful changes surface in Focus automatically.",
  },
  {
    Icon: BarChart3,
    title: "Win-rate dashboard.",
    body: "See conversion and deal value from the leads you already track — no new data entry.",
  },
  {
    Icon: Search,
    title: "Built for small operators.",
    body: "Research that feeds your pipeline and content — not a bolted-on CI tool with ops chrome.",
  },
];

const FEATURES = [
  "Cited lead intelligence briefs",
  "Competitor watchlist + Focus signals",
  "Google Places location layer",
  "Win-rate analytics dashboard",
];

const RESEARCH_GRADIENT =
  "linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #0891b2 100%)";

function CheckoutButton({
  loading,
  disabled,
  onClick,
  label = "Unlock Research",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-opacity hover:opacity-90",
        compact ? "min-h-[44px] px-5 py-2.5" : "w-full min-h-[48px] py-3.5"
      )}
      style={{ background: RESEARCH_GRADIENT }}
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

export function ResearchCheckoutClient({ priceId }: Props) {
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
        aria-label="WISK Research hero"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(6,182,212,0.12), transparent 60%)",
        }}
      >
        <div className="px-4 py-12 md:px-6 lg:px-8">
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: MOTION_EASE.easeOut }}
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-500"
          >
            WISK Research
          </motion.p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Cited research that feeds your pipeline — not another browser tab.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Lead briefs, competitor signals, and win-rate analytics — £19/month.
            Cancel anytime.
          </p>
          <div ref={ctaRef} className="mt-8 max-w-sm">
            <CheckoutButton
              loading={loading}
              disabled={!priceId || loading}
              onClick={() => void handleCheckout()}
            />
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Secure checkout via Stripe
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-2" aria-label="Capabilities">
        {CAPABILITIES.map((cap, index) => (
          <motion.div
            key={cap.title}
            initial={noMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.35,
              delay: noMotion ? 0 : index * 0.1,
              ease: MOTION_EASE.easeOut,
            }}
            className="rounded-2xl border border-cyan-500/15 bg-card/80 p-6 shadow-sm"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <cap.Icon className="size-5 text-cyan-500" aria-hidden />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {cap.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {cap.body}
            </p>
          </motion.div>
        ))}
      </section>

      <section
        className="mb-16 rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8"
        aria-label="What you get"
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-cyan-500" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Included</h2>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-cyan-500"
                aria-hidden
              />
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-6 max-w-sm">
          <CheckoutButton
            loading={loading}
            disabled={!priceId || loading}
            onClick={() => void handleCheckout()}
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Want open research chat and findings → proposals?{" "}
          <Link
            href="/upgrade/research-pro"
            className="font-medium text-cyan-500 hover:underline"
          >
            See Research Pro (£39/mo)
          </Link>
        </p>
      </section>

      <AnimatePresence>
        {!ctaInView ? (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:hidden"
            style={{
              paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
            }}
          >
            <CheckoutButton
              loading={loading}
              disabled={!priceId || loading}
              onClick={() => void handleCheckout()}
              compact
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
