"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { dismissFeedbackWelcome } from "@/app/(dashboard)/settings/feedback/actions";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION } from "@/lib/motion/config";

type FeedbackWelcomeModalProps = {
  displayName: string;
  open: boolean;
};

export function FeedbackWelcomeModal({
  displayName,
  open,
}: FeedbackWelcomeModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!visible || isAdminRoute) {
    return null;
  }

  async function handleDismiss() {
    await dismissFeedbackWelcome();
    setVisible(false);
    router.refresh();
  }

  async function handleLeaveFeedback() {
    await dismissFeedbackWelcome();
    setVisible(false);
    router.push("/settings#feedback");
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[205] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome feedback"
    >
      <motion.div
        className="absolute inset-0 bg-black/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.fast }}
        aria-hidden
      />

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-200/20 bg-gradient-to-b from-orange-500/10 via-card to-card px-6 py-8 text-center shadow-2xl dark:border-orange-500/15 dark:from-orange-500/8"
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.normal, ease: "easeOut" }}
      >
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full blur-3xl"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.12 300 / 0.18) 0%, oklch(0.7 0.1 180 / 0.1) 50%, transparent 75%)",
          }}
        />

        <div className="relative z-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-transparent">
              Welcome to WISK, {displayName}.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Thanks for joining — you&apos;re one of the first people to use this
            and your feedback genuinely matters. If anything feels off, we&apos;d
            love to hear it.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => void handleLeaveFeedback()}>
              Leave feedback →
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDismiss()}
            >
              Got it
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
