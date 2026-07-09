"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { WiskPackage } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpgradeSuccessClientProps = {
  pkg: WiskPackage | null;
  planLabel: string;
};

// ─── Per-package unlock descriptions ──────────────────────────────────────────

const PACKAGE_UNLOCKS: Partial<Record<WiskPackage, string[]>> = {
  ai: [
    "AI Digest — your weekly business summary, every Sunday",
    "WISK Chat — ask Winston anything about your business",
    "Smart suggestions on your Overview dashboard",
  ],
  ai_pro: [
    "Everything in WISK AI, activated immediately",
    "Email integration — connect Gmail or Outlook from Settings",
    "AI-organised inbox linked to your leads and clients",
    "Higher monthly token allowance",
  ],
  max: [
    "The full WISK AI suite, including email integration",
    "Access to all current and future packages",
    "Highest usage limits across every feature",
  ],
  properties: [
    "Portfolio dashboard",
    "Tenant management",
    "Maintenance tracking",
    "Rent tracking",
    "Certificate alerts",
    "Document storage",
    "Winston property insights",
  ],
  properties_pro: [
    "Everything in WISK Properties",
    "SA105 tax summary",
    "Legal notice templates (Section 8)",
    "Winston Pro property insights",
    "Yield analytics",
    "Tenant reliability scoring",
    "Financial reports",
  ],
};

const PENDING_UNLOCKS = [
  "WISK Command Centre — projects, tasks, goals, leads, and more",
];

function getUnlocks(pkg: WiskPackage | null): string[] {
  if (!pkg) return PENDING_UNLOCKS;
  return PACKAGE_UNLOCKS[pkg] ?? PENDING_UNLOCKS;
}

function getPrimaryCta(pkg: WiskPackage | null): { href: string; label: string } {
  if (pkg === "ai" || pkg === "ai_pro") {
    return { href: "/ai-digest", label: "Go to Winston" };
  }
  if (pkg === "properties" || pkg === "properties_pro") {
    return { href: "/properties", label: "Go to Properties" };
  }
  if (pkg) {
    return { href: "/", label: "Go to overview" };
  }
  return { href: "/", label: "Go to overview" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradeSuccessClient({
  pkg,
  planLabel,
}: UpgradeSuccessClientProps) {
  const { getInitial, transition, reduced } = useMotionSafe();

  const isActivePlan = pkg !== null;
  const unlocks = getUnlocks(pkg);
  const primaryCta = getPrimaryCta(pkg);

  const checkVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: reduced ? 0 : 0.35, ease: MOTION_EASE.smooth },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0 : 0.3,
        ease: MOTION_EASE.smooth,
        delay: reduced ? 0 : 0.25,
      },
    },
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Animated check icon */}
      <motion.div
        initial={getInitial(checkVariants.hidden)}
        animate="visible"
        variants={checkVariants}
        className="mb-6"
      >
        <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
          <CheckCircle2
            className="size-10 text-emerald-500"
            aria-hidden
            strokeWidth={1.5}
          />
        </div>
      </motion.div>

      {/* Heading and sub-content */}
      <motion.div
        initial={getInitial(contentVariants.hidden)}
        animate="visible"
        variants={contentVariants}
        className="max-w-md space-y-6"
        transition={transition}
      >
        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isActivePlan ? (
              <>
                Welcome to{" "}
                <span
                  style={{
                    backgroundImage: "linear-gradient(to right, #016c81, #c3ff32)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {planLabel}
                </span>
                .
              </>
            ) : (
              "You\u2019re in."
            )}
          </h1>
          <p className="text-base text-muted-foreground">
            {isActivePlan
              ? "Your subscription is active. Here\u2019s what\u2019s now unlocked."
              : "Your payment was successful. Your new features will be available shortly."}
          </p>
        </div>

        {/* Unlocks list */}
        <ul className="space-y-2.5 text-left">
          {unlocks.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <Sparkles className="size-3 text-emerald-500" aria-hidden />
              </span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href={primaryCta.href}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-wisk-lime text-wisk-dark hover:bg-wisk-lime/90"
            )}
          >
            {primaryCta.label}
          </Link>

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-muted-foreground"
            )}
          >
            Back to overview
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
