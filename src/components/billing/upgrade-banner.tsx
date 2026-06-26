"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { dismissUpgradeBanner } from "@/app/(dashboard)/actions/upgrade-banner";
import type { BillingPlan } from "@/lib/billing/types";

type UpgradeBannerProps = {
  plan: BillingPlan;
};

const CTA_GRADIENT =
  "linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #14b8a6 100%)";

export function UpgradeBanner({ plan }: UpgradeBannerProps) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  async function handleDismiss() {
    setVisible(false);
    await dismissUpgradeBanner();
  }

  return (
    <motion.div
      data-plan={plan}
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/8 to-teal-500/8"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <Sparkles
            className="mt-0.5 size-4 shrink-0 text-purple-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Unlock Winston AI, email intelligence, and more.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              From £9/month
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/upgrade"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CTA_GRADIENT }}
          >
            See plans
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
