"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Inbox,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { priceId: string };

// ─── Content data ─────────────────────────────────────────────────────────────

const BASE_FEATURES = [
  "AI Digest every Sunday",
  "WISK Chat — ask anything",
  "Smart suggestions",
  "100,000 tokens per month",
];

const PRO_ADDITIONS = [
  "Email integration (Gmail + Outlook)",
  "AI-organised inbox",
  "Emails linked to leads and clients",
  "Higher usage limits",
  "Priority support",
];

const HOW_IT_WORKS = [
  {
    Icon: Mail,
    step: "01",
    title: "Connect your inbox",
    body: "Link Gmail or Outlook in one click. Your emails stay private — Winston only reads what you allow.",
  },
  {
    Icon: Inbox,
    step: "02",
    title: "Winston organises everything",
    body: "Emails are grouped automatically: Leads, Clients, Admin. No more hunting through your inbox.",
  },
  {
    Icon: Zap,
    step: "03",
    title: "Action items surface in WISK",
    body: "Emails from known leads link to their pipeline card. Follow-ups, proposals, replies — all visible where they matter.",
  },
];

const ALL_FEATURES = [
  "Everything in WISK AI",
  "Email integration — Gmail and Outlook",
  "AI-organised inbox linked to your leads",
  "Higher usage limits",
  "Priority support",
];

// ─── Connection diagram (hero visual) ─────────────────────────────────────────

function ConnectionDiagram({ noMotion }: { noMotion: boolean }) {
  return (
    <div className="mx-auto flex max-w-xs items-center gap-0" aria-label="Email and WISK connected">
      {/* Email node */}
      <motion.div
        initial={noMotion ? false : { opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: noMotion ? 0 : 0.3, ease: MOTION_EASE.easeOut }}
        className="flex flex-col items-center gap-2 rounded-2xl px-5 py-4"
        style={{
          background: "rgba(20,184,166,0.12)",
          border: "1px solid rgba(20,184,166,0.3)",
        }}
      >
        <Mail className="size-6 text-teal-300" aria-hidden />
        <span className="text-xs font-medium text-teal-200">Your Inbox</span>
      </motion.div>

      {/* Connecting line with animated data dots */}
      <div className="relative mx-3 h-px w-24 shrink-0 overflow-visible">
        {/* Static line */}
        <div
          className="absolute top-0 left-0 h-px w-full"
          style={{
            background:
              "linear-gradient(to right, rgba(20,184,166,0.5), rgba(34,211,238,0.8), rgba(20,184,166,0.5))",
          }}
        />
        {/* Animated dots */}
        {!noMotion &&
          [0, 0.9].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute top-0 -mt-[3px] size-[7px] rounded-full"
              style={{
                background: "#2dd4bf",
                boxShadow: "0 0 8px rgba(45, 212, 191, 0.9)",
              }}
              animate={{ x: [-4, 92] }}
              transition={{
                duration: 1.6,
                ease: "linear",
                repeat: Infinity,
                delay,
              }}
            />
          ))}
      </div>

      {/* WISK node */}
      <motion.div
        initial={noMotion ? false : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: noMotion ? 0 : 0.3, ease: MOTION_EASE.easeOut }}
        className="flex flex-col items-center gap-2 rounded-2xl px-5 py-4"
        style={{
          background: "rgba(168,85,247,0.1)",
          border: "1px solid rgba(168,85,247,0.25)",
        }}
      >
        <Sparkles className="size-6 text-purple-300" aria-hidden />
        <span className="text-xs font-medium text-purple-200">WISK</span>
      </motion.div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StaggerWords({
  text,
  baseDelay = 0,
  noMotion,
}: {
  text: string;
  baseDelay?: number;
  noMotion: boolean;
}) {
  const words = text.split(" ");
  return (
    <span className="inline">
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

// ─── Pricing CTA button ───────────────────────────────────────────────────────

function CheckoutButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={loading ? "Redirecting to Stripe" : "Unlock AI Pro — secure checkout"}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-[48px] transition-opacity hover:opacity-90"
      )}
      style={{
        background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #22d3ee 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 ease-in-out group-hover:translate-x-full"
      />
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {loading ? "Redirecting to Stripe…" : "Unlock AI Pro"}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIProCheckoutClient({ priceId }: Props) {
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();
  const noMotion = reduced === true;

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
        aria-label="WISK AI Pro hero"
        style={{
          background:
            "linear-gradient(145deg, #020e0e 0%, #051c1c 40%, #030d14 100%)",
        }}
      >
        {/* Dot-grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(20,184,166,0.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient glow orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 size-80 rounded-full blur-3xl"
          style={{ background: "rgba(15, 118, 110, 0.4)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-28 size-64 rounded-full blur-3xl"
          style={{ background: "rgba(34, 211, 238, 0.15)" }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center md:px-6 md:py-20 lg:px-8">
          {/* Eyebrow */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: MOTION_EASE.easeOut }}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-teal-400"
          >
            WISK AI PRO
          </motion.p>

          {/* Connection diagram */}
          <motion.div
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: noMotion ? 0 : 0.1, ease: MOTION_EASE.easeOut }}
            className="mb-10"
          >
            <ConnectionDiagram noMotion={noMotion} />
          </motion.div>

          {/* Headline */}
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
            <motion.span
              className="block"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #2dd4bf, #14b8a6 40%, #22d3ee)",
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
              Everything Winston knows.
            </motion.span>

            <span className="mt-1 block text-white">
              <StaggerWords
                text="Now including your inbox."
                baseDelay={noMotion ? 0 : 0.44}
                noMotion={noMotion}
              />
            </span>
          </h1>

          {/* Subheading */}
          <motion.p
            initial={noMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: noMotion ? 0 : 0.78, ease: MOTION_EASE.easeOut }}
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
          >
            WISK AI Pro connects Winston to your Gmail and Outlook. Client emails link to your pipeline. Action items surface automatically. Your business and your inbox, finally in one place.
          </motion.p>

          {/* Trust signals */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: noMotion ? 0 : 0.92, ease: MOTION_EASE.easeOut }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Mail className="size-3.5 text-teal-400" aria-hidden />
              Gmail + Outlook
            </span>
            <span className="hidden text-white/20 sm:block" aria-hidden>·</span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <ShieldCheck className="size-3.5 text-cyan-400" aria-hidden />
              Built on WISK AI
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: What's different about Pro ─────────────────────────────── */}
      <section className="mb-14" aria-label="WISK AI vs WISK AI Pro comparison">
        <motion.p
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: MOTION_EASE.smooth }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          What&apos;s different about Pro
        </motion.p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Base WISK AI — muted */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: MOTION_EASE.easeOut }}
            className="rounded-2xl border border-border/40 bg-card/50 p-6"
          >
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              Everything in WISK AI
            </p>
            <ul className="space-y-2.5">
              {BASE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground/70"
                >
                  <Check className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro additions — highlighted */}
          <motion.div
            initial={noMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: noMotion ? 0 : 0.1, ease: MOTION_EASE.easeOut }}
            className="rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(20,184,166,0.08), rgba(20,184,166,0.04))",
              border: "1px solid rgba(20,184,166,0.3)",
              boxShadow: "0 4px 24px -4px rgba(20,184,166,0.15)",
            }}
          >
            <p className="mb-4 text-sm font-semibold text-teal-400">
              Plus with AI Pro
            </p>
            <ul className="space-y-2.5">
              {PRO_ADDITIONS.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                    style={{
                      background: "rgba(20,184,166,0.15)",
                      border: "1px solid rgba(20,184,166,0.3)",
                      color: "#2dd4bf",
                    }}
                    aria-hidden
                  >
                    ◆
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: How the email integration works ────────────────────────── */}
      <section className="mb-14" aria-label="How the email integration works">
        <motion.p
          initial={noMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: MOTION_EASE.smooth }}
          className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          How the email integration works
        </motion.p>

        <div className="relative grid gap-4 sm:grid-cols-3">
          {/* Connecting line (desktop only) */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-9 left-[20%] right-[20%] hidden h-px sm:block"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(20,184,166,0.3) 20%, rgba(20,184,166,0.3) 80%, transparent)",
            }}
          />

          {HOW_IT_WORKS.map(({ Icon, step, title, body }, i) => (
            <motion.div
              key={step}
              initial={noMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.35,
                delay: noMotion ? 0 : i * 0.12,
                ease: MOTION_EASE.easeOut,
              }}
              className="relative rounded-2xl border border-border/50 bg-card/80 p-6"
            >
              {/* Step number */}
              <p
                className="mb-3 text-xs font-bold tracking-[0.15em]"
                style={{ color: "rgba(20,184,166,0.5)" }}
              >
                {step}
              </p>
              {/* Icon */}
              <div
                className="mb-4 flex size-10 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.25)",
                }}
              >
                <Icon className="size-5 text-teal-300" aria-hidden />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Section 4: Pricing ────────────────────────────────────────────────── */}
      <section className="mx-auto mb-4 max-w-lg" aria-label="WISK AI Pro pricing">
        <motion.div
          initial={noMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: MOTION_EASE.easeOut }}
          className="rounded-2xl border bg-card/90 p-8"
          style={{
            borderColor: "rgba(20,184,166,0.3)",
            boxShadow: "0 8px 40px -8px rgba(20,184,166,0.2)",
          }}
        >
          {/* Plan name and price */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-[0.15em]"
                style={{ color: "#14b8a6" }}
              >
                WISK AI PRO
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  £19
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{
                background: "rgba(20,184,166,0.15)",
                border: "1px solid rgba(20,184,166,0.3)",
              }}
            >
              <Mail className="size-5 text-teal-300" aria-hidden />
            </div>
          </div>

          <p className="mb-1 text-xs font-medium text-teal-500">
            Includes everything in WISK AI
          </p>
          <p className="mb-6 text-xs text-muted-foreground">
            Billed monthly. Cancel any time.
          </p>

          {/* Feature list */}
          <ul className="mb-8 space-y-3">
            {ALL_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background: "rgba(20,184,166,0.12)",
                    border: "1px solid rgba(20,184,166,0.25)",
                    color: "#2dd4bf",
                  }}
                  aria-hidden
                >
                  ◆
                </span>
                <span className="text-sm text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <CheckoutButton
            loading={loading}
            disabled={loading || !priceId}
            onClick={handleCheckout}
          />

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout via Stripe
          </p>
        </motion.div>
      </section>
    </div>
  );
}
