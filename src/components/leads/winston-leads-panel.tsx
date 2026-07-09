"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  Lock,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useIsMobilePanel } from "@/components/calendar/use-is-mobile-panel";
import { LeadCallNotes } from "@/components/leads/lead-call-notes";
import { LeadSelector } from "@/components/leads/lead-selector";
import { WinstonEmailDraftCard } from "@/components/leads/winston-email-draft-card";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { Lead } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type WinstonLeadsPanelProps = {
  open: boolean;
  onClose: () => void;
  canAccessWinston: boolean;
  leads: Lead[];
  onLeadUpdate: (lead: Lead) => void;
};

function WinstonGradientIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-wisk-section-leads",
        className
      )}
    >
      <Sparkles className="size-4 text-white" aria-hidden />
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <WinstonGradientIcon />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close Winston panel"
        onClick={onClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function TeaserContent({ onClose }: { onClose: () => void }) {
  const features = [
    {
      title: "Call notes processor",
      description:
        "Paste a transcript — Winston extracts key details, next steps, and updates the lead automatically.",
    },
    {
      title: "AI email drafting",
      description:
        "Select a lead, Winston writes a personalised follow-up based on your history with them.",
    },
    {
      title: "Pipeline intelligence (coming soon)",
      description:
        "Winston flags stalled leads, overdue follow-ups, and conversion patterns.",
    },
  ];

  return (
    <>
      <PanelHeader title="Winston for Leads" onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Winston brings AI intelligence to your pipeline. Process call notes in
          seconds, get AI-drafted follow-up emails, and let Winston analyse your
          pipeline health — all without leaving your leads section.
        </p>

        <div className="space-y-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-start gap-2">
                <Lock
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/upgrade" className="block">
          <Button
            type="button"
            className="w-full bg-wisk-section-leads text-white hover:opacity-90"
          >
            Upgrade to WISK AI
          </Button>
        </Link>
        <p className="text-center text-[11px] text-muted-foreground">
          From £9/mo · Cancel anytime
        </p>
      </div>
    </>
  );
}

function CallNotesCard({
  leads,
  onLeadUpdate,
}: {
  leads: Lead[];
  onLeadUpdate: (lead: Lead) => void;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <Phone className="size-4 text-blue-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Call notes</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Paste your call transcript or notes. Winston extracts the summary,
            key details, objections, next steps, and suggests the next stage and
            follow-up date.
          </p>
        </div>
      </div>

      <LeadSelector
        leads={leads}
        value={selectedLeadId}
        onChange={setSelectedLeadId}
        placeholder="Select a lead..."
      />

      {selectedLead ? (
        <LeadCallNotes
          lead={selectedLead}
          variant="panel"
          onNotesApplied={onLeadUpdate}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Select a lead to get started</p>
      )}
    </div>
  );
}

function PipelineHealthCard() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wisk-section-leads/10">
          <BarChart2 className="size-4 text-wisk-section-leads" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Pipeline health
            </h3>
            <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Coming soon
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Winston will analyse your full pipeline and surface patterns, risks,
            and opportunities.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccessContent({
  leads,
  onLeadUpdate,
  onClose,
}: {
  leads: Lead[];
  onLeadUpdate: (lead: Lead) => void;
  onClose: () => void;
}) {
  return (
    <>
      <PanelHeader
        title="Winston"
        subtitle="AI features for your pipeline"
        onClose={onClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <CallNotesCard leads={leads} onLeadUpdate={onLeadUpdate} />
        <WinstonEmailDraftCard leads={leads} />
        <PipelineHealthCard />
      </div>
    </>
  );
}

function PanelShell({
  children,
  onClose,
  isMobile,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isMobile: boolean;
}) {
  const { reduced } = useMotionSafe();

  if (isMobile) {
    return (
      <>
        <motion.button
          type="button"
          aria-label="Close Winston panel"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
        />
        <motion.aside
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border/60 bg-card shadow-2xl md:hidden"
          initial={reduced ? false : { x: "100%" }}
          animate={{ x: 0 }}
          exit={reduced ? undefined : { x: "100%" }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
          }
        >
          {children}
        </motion.aside>
      </>
    );
  }

  return (
    <motion.aside
      className="hidden h-[calc(100dvh-10rem)] w-96 shrink-0 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm md:flex"
      initial={reduced ? false : { x: "100%" }}
      animate={{ x: 0 }}
      exit={reduced ? undefined : { x: "100%" }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
      }
    >
      {children}
    </motion.aside>
  );
}

export function WinstonLeadsPanel({
  open,
  onClose,
  canAccessWinston,
  leads,
  onLeadUpdate,
}: WinstonLeadsPanelProps) {
  const isMobile = useIsMobilePanel();

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence mode="wait">
      {open ? (
        <PanelShell key="winston-panel" onClose={onClose} isMobile={isMobile}>
          <div className="flex h-full min-h-0 flex-col">
            {canAccessWinston ? (
              <AccessContent
                leads={leads}
                onLeadUpdate={onLeadUpdate}
                onClose={onClose}
              />
            ) : (
              <TeaserContent onClose={onClose} />
            )}
          </div>
        </PanelShell>
      ) : null}
    </AnimatePresence>
  );
}
