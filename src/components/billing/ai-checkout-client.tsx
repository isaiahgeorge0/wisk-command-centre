"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { priceId: string };

type CapItem = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

// ─── Content data ─────────────────────────────────────────────────────────────

const CAPABILITIES: CapItem[] = [
  {
    Icon: CalendarDays,
    title: "Knows your week before you do",
    body: "Every Sunday, Winston reviews your entire business and surfaces what matters most. Wins, risks, and what to focus on next.",
  },
  {
    Icon: MessageSquare,
    title: "Answers your hardest questions",
    body: "Ask Winston anything about your business. Pipeline health, content performance, goal progress. Real answers, not generic advice.",
  },
  {
    Icon: Eye,
    title: "Spots what you'd miss",
    body: "Stalled projects, cooling leads, goals drifting off track. Winston flags them before they become problems.",
  },
  {
    Icon: TrendingUp,
    title: "Gets smarter over time",
    body: "The more you use WISK, the more context Winston has. The insights compound.",
  },
];

const FEATURES = [
  "AI Digest every Sunday",
  "WISK Chat — ask anything",
  "Smart suggestions across your workspace",
  "100,000 tokens per month",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Capability card ──────────────────────────────────────────────────────────

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
      className="rounded-2xl border border-wisk-purple/15 bg-card/80 p-6 shadow-sm"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-wisk-purple/20 bg-wisk-purple/10">
        <Icon className="size-5 text-wisk-purple" aria-hidden={true} />
      </div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}

// ─── Checkout button (shared between main CTA and sticky bar) ─────────────────

function CheckoutButton({
  loading,
  disabled,
  onClick,
  label = "Unlock Winston",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-opacity hover:opacity-90",
        compact
          ? "min-h-[44px] px-5 py-2.5"
          : "w-full min-h-[48px] py-3.5"
      )}
      style={{
        background: "linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #14b8a6 100%)",
      }}
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AICheckoutClient({ priceId }: Props) {
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();
  const noMotion = reduced === true;

  // IntersectionObserver: track when the main CTA button is in view
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
      {/* ── Back link ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to plans
        </Link>
      </div>

      {/* ── Section 1: Hero ───────────────────────────────────────────────────── */}
      <section
        className="-mx-4 mb-12 overflow-hidden md:-mx-6 lg:-mx-8"
        aria-label="WISK AI hero"
        style={{
          background:
            "linear-gradient(145deg, #0a0518 0%, #130a2e 40%, #0c1020 100%)",
        }}
      >
        {/* Dot-grid overlay */}
        <div
          aria-hidden
          className="absolute pointer-events-none inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(168,85,247,0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient glow orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-48 size-96 rounded-full blur-3xl"
          style={{ background: "rgba(109, 40, 217, 0.3)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 size-72 rounded-full blur-3xl"
          style={{ background: "rgba(20, 184, 166, 0.15)" }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-20 lg:px-8">
          {/* Eyebrow */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: MOTION_EASE.easeOut }}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400"
          >
            WISK AI
          </motion.p>

          {/* Winston icon */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: MOTION_EASE.easeOut }}
            className="mx-auto mb-8 flex size-20 items-center justify-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(109,40,217,0.4), rgba(168,85,247,0.2))",
              boxShadow:
                "0 0 0 1px rgba(168,85,247,0.3), 0 0 40px rgba(168,85,247,0.3), 0 0 80px rgba(109,40,217,0.2)",
            }}
          >
            <Sparkles className="size-9 text-purple-300" aria-hidden />
          </motion.div>

          {/* Headline */}
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
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
                delay: noMotion ? 0 : 0.2,
                ease: MOTION_EASE.easeOut,
              }}
            >
              Meet Winston.
            </motion.span>

            <span className="mt-1 block text-white">
              <StaggerWords
                text="Your AI business assistant."
                baseDelay={noMotion ? 0 : 0.42}
                noMotion={noMotion}
              />
            </span>
          </h1>

          {/* Subheading */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: noMotion ? 0 : 0.75, ease: MOTION_EASE.easeOut }}
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
          >
            Winston reads your entire business — projects, tasks, leads, goals, content — and tells you what it means. Every week. On demand. Without you having to ask.
          </motion.p>

          {/* Trust signals */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: noMotion ? 0 : 0.9, ease: MOTION_EASE.easeOut }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Zap className="size-3.5 text-purple-400" aria-hidden />
              Powered by Claude AI
            </span>
            <span className="hidden text-white/20 sm:block" aria-hidden>·</span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <ShieldCheck className="size-3.5 text-teal-400" aria-hidden />
              Your data stays yours
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Capability cards ───────────────────────────────────────── */}
      <section className="mb-14" aria-label="What Winston does">
        <motion.p
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: MOTION_EASE.smooth }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          What Winston does
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAPABILITIES.map((cap, i) => (
            <CapabilityCard
              key={cap.title}
              {...cap}
              index={i}
              noMotion={noMotion}
            />
          ))}
        </div>
      </section>

      {/* ── Section 3: Pricing ────────────────────────────────────────────────── */}
      <section className="mx-auto mb-6 max-w-lg" aria-label="WISK AI pricing">
        <motion.div
          initial={noMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: MOTION_EASE.easeOut }}
          className="rounded-2xl border border-wisk-purple/25 bg-card/90 p-8 shadow-[0_8px_40px_-8px_rgba(168,85,247,0.25)]"
        >
          {/* Plan name and price */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-[0.15em]"
                style={{ color: "#a855f7" }}
              >
                WISK AI
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  £9
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(109,40,217,0.3), rgba(168,85,247,0.15))",
                boxShadow: "0 0 0 1px rgba(168,85,247,0.25)",
              }}
            >
              <Sparkles className="size-5 text-purple-300" aria-hidden />
            </div>
          </div>

          <p className="mb-6 text-xs text-muted-foreground">
            Billed monthly. Cancel any time.
          </p>

          {/* Feature list */}
          <ul className="mb-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background: "rgba(168,85,247,0.15)",
                    border: "1px solid rgba(168,85,247,0.25)",
                    color: "#c084fc",
                  }}
                  aria-hidden
                >
                  ◆
                </span>
                <span className="text-sm text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          {/* Main CTA — observed by IntersectionObserver */}
          <div ref={ctaRef}>
            <CheckoutButton
              loading={loading}
              disabled={loading || !priceId}
              onClick={handleCheckout}
            />
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout via Stripe
          </p>
        </motion.div>
      </section>

      {/* ── Section 4: Upsell ─────────────────────────────────────────────────── */}
      <section className="mx-auto mb-4 max-w-lg" aria-label="WISK AI Pro upgrade">
        <motion.div
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1, ease: MOTION_EASE.easeOut }}
          className="rounded-2xl border border-wisk-purple/15 bg-card/50 px-6 py-5"
        >
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-wisk-purple">
            Want more?
          </p>
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            WISK AI Pro adds Gmail and Outlook integration — Winston reads your inbox, surfaces action items from client emails, and connects your conversations to your pipeline. £10 more per month.
          </p>
          <Link
            href="/upgrade/ai-pro"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-wisk-purple transition-opacity hover:opacity-80"
          >
            See WISK AI Pro
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>
      </section>

      {/* ── Sticky bottom CTA bar ─────────────────────────────────────────────── */}
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
              // On mobile: sit above the bottom nav (~52px + safe area)
              "bottom-[calc(3.25rem+env(safe-area-inset-bottom))]",
              // On desktop: bottom nav is hidden, go to bottom edge
              "md:bottom-0"
            )}
            aria-label="Quick checkout"
          >
            <div
              className="border-t bg-background/95 backdrop-blur-md"
              style={{ borderTopColor: "rgba(168, 85, 247, 0.4)" }}
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-6 lg:px-8">
                {/* Plan info */}
                <div>
                  <p className="text-sm font-semibold text-foreground">WISK AI</p>
                  <p className="text-xs text-muted-foreground">£9 / month</p>
                </div>

                {/* CTA button */}
                <CheckoutButton
                  loading={loading}
                  disabled={loading || !priceId}
                  onClick={handleCheckout}
                  label="Unlock Winston"
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
