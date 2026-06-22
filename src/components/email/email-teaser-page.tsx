"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

const FAKE_EMAILS = [
  {
    from: "Sarah Mitchell",
    subject: "Re: Brand refresh timeline",
    preview: "Thanks for sending this over — the direction looks great. Can we lock the palette before Friday?",
    time: "2h",
    unread: true,
  },
  {
    from: "Oakwood Studio",
    subject: "Proposal follow-up",
    preview: "Just checking in on the proposal we sent last week. Happy to jump on a call if helpful.",
    time: "Yesterday",
    unread: true,
  },
  {
    from: "Stripe",
    subject: "Your payout is on the way",
    preview: "A payout of £2,480.00 is expected to arrive in your bank account within 2 business days.",
    time: "Mon",
    unread: false,
  },
  {
    from: "Alex Chen",
    subject: "Content calendar for June",
    preview: "I've mapped the first two weeks — let me know if the LinkedIn cadence feels right.",
    time: "Sun",
    unread: false,
  },
];

function InboxPreview() {
  return (
    <div className="pointer-events-none select-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/15">
          <Mail className="size-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Email
          </h1>
          <p className="text-sm text-muted-foreground">
            Gmail and Outlook in one place
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="h-9 rounded-lg bg-muted/60" />
        </div>
        <ul className="divide-y divide-border/60">
          {FAKE_EMAILS.map((email) => (
            <li key={email.subject} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm",
                      email.unread
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground"
                    )}
                  >
                    {email.from}
                  </p>
                  <p
                    className={cn(
                      "truncate text-sm",
                      email.unread ? "font-medium text-foreground" : "text-foreground/80"
                    )}
                  >
                    {email.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {email.preview}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {email.time}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function EmailTeaserPage() {
  const { getPageInitial, getPageAnimate, pageTransition } = useMotionSafe();

  return (
    <motion.div
      initial={getPageInitial()}
      animate={getPageAnimate()}
      transition={pageTransition}
    >
      <div className="relative min-h-[70vh]">
        <div className="w-full" style={{ filter: "blur(8px)" }} aria-hidden="true">
          <InboxPreview />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 to-background/80"
          aria-hidden="true"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center px-6 py-10 text-center"
          >
            <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-blue-500/15 shadow-lg ring-1 ring-blue-500/20">
              <Mail className="size-9 text-blue-500" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Your inbox, inside WISK.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80">
              Connect Gmail and Outlook, and let Winston read, organise, and
              prioritise your emails. Available on WISK AI Pro.
            </p>

            <ul className="mt-5 max-w-md space-y-3 text-left">
              {[
                "Unified inbox across Gmail and Outlook",
                "Read and search emails without leaving WISK",
                "Winston-ready foundation for inbox intelligence",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 pl-1">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-wisk-teal"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/upgrade/ai-pro"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 gap-2")}
            >
              Upgrade to AI Pro
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
