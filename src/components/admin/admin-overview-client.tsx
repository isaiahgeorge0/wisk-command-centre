"use client";

import { AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  Mail,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

import { SectionCard } from "@/components/overview/section-card";
import type { SectionCardItem } from "@/components/overview/section-card";
import { SectionCardModal } from "@/components/overview/section-card-modal";

/* ------------------------------------------------------------------ */
/*  Neutral admin accent palette (slate/graphite, not customer brand) */
/* ------------------------------------------------------------------ */

const ADMIN_COLOURS_DARK = {
  revenue: "#94a3b8",
  aiUsage: "#a78bfa",
  properties: "#f87171",
  winston: "#c084fc",
  integrations: "#818cf8",
  briefing: "#38bdf8",
  platform: "#6ee7b7",
} as const;

const ADMIN_COLOURS_LIGHT = {
  revenue: "#475569",
  aiUsage: "#7c3aed",
  properties: "#dc2626",
  winston: "#9333ea",
  integrations: "#4f46e5",
  briefing: "#0284c7",
  platform: "#059669",
} as const;

/* ------------------------------------------------------------------ */
/*  Props — each card receives pre-computed server data                */
/* ------------------------------------------------------------------ */

export type AdminOverviewData = {
  revenue: {
    totalMRR: number;
    topPackages: Array<{ name: string; mrr: number }>;
    unconfiguredCount: number;
  };
  aiUsage: {
    estimatedCostUSD: number;
    topFeatures: Array<{ name: string; costUSD: number }>;
  };
  properties: {
    totalProperties: number;
    overdueCerts: number;
    openMaintenance: number;
    missingRent: number;
  };
  winston: {
    totalConversations: number;
    noteCount: number;
    sectionCount: number;
    generalCount: number;
  };
  integrations: {
    totalConnected: number;
    gmailCount: number;
    outlookCount: number;
    flaggedCount: number;
  };
  briefing: {
    lastSentAtISO: string | null;
    deliveredCount: number;
    pendingCount: number;
  };
  platform: {
    totalTables: number;
    totalRows: number;
    topTables: Array<{ name: string; count: number }>;
  };
};

type AdminOverviewClientProps = {
  data: AdminOverviewData;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function relativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOverviewClient({ data }: AdminOverviewClientProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const C = isDark ? ADMIN_COLOURS_DARK : ADMIN_COLOURS_LIGHT;

  const [expanded, setExpanded] = useState<string | null>(null);

  type CardDef = {
    cardId: string;
    title: string;
    href: string;
    accent: string;
    icon: React.ReactNode;
    stat: { label: string; value: string | number };
    alert?: { label: string; count: number } | null;
    items: SectionCardItem[];
    expandedItems?: SectionCardItem[];
    emptyMessage: string;
    cta: string;
  };

  const cards: CardDef[] = [
    {
      cardId: "admin-revenue",
      title: "Revenue",
      href: "/admin/subscriptions",
      accent: C.revenue,
      icon: <CreditCard size={16} style={{ color: C.revenue }} />,
      stat: { label: "known MRR", value: formatCurrency(data.revenue.totalMRR, "GBP") },
      alert: data.revenue.unconfiguredCount > 0
        ? { label: "packages missing price", count: data.revenue.unconfiguredCount }
        : null,
      items: data.revenue.topPackages.map((p) => ({
        label: p.name,
        sub: formatCurrency(p.mrr, "GBP"),
      })),
      emptyMessage: "No active subscriptions.",
      cta: "View revenue breakdown",
    },
    {
      cardId: "admin-ai-usage",
      title: "AI Usage",
      href: "/admin/ai-usage",
      accent: C.aiUsage,
      icon: <Zap size={16} style={{ color: C.aiUsage }} />,
      stat: { label: "est. cost this month", value: formatUSD(data.aiUsage.estimatedCostUSD) },
      items: data.aiUsage.topFeatures.map((f) => ({
        label: f.name,
        sub: formatUSD(f.costUSD),
      })),
      emptyMessage: "No AI usage recorded this month.",
      cta: "View AI cost breakdown",
    },
    {
      cardId: "admin-properties",
      title: "Properties",
      href: "/admin/properties",
      accent: C.properties,
      icon: <Building2 size={16} style={{ color: C.properties }} />,
      stat: { label: "total properties", value: data.properties.totalProperties },
      alert: data.properties.overdueCerts > 0
        ? { label: "overdue certificates", count: data.properties.overdueCerts }
        : null,
      items: [
        { label: "Overdue certificates", sub: String(data.properties.overdueCerts) },
        { label: "Open maintenance tickets", sub: String(data.properties.openMaintenance) },
        { label: "Missing rent data", sub: String(data.properties.missingRent) },
      ],
      emptyMessage: "No properties tracked.",
      cta: "View properties overview",
    },
    {
      cardId: "admin-winston",
      title: "Winston Engagement",
      href: "/admin/winston-engagement",
      accent: C.winston,
      icon: <Bot size={16} style={{ color: C.winston }} />,
      stat: { label: "conversations (30d)", value: data.winston.totalConversations },
      items: [
        { label: "Note-level", sub: String(data.winston.noteCount) },
        { label: "Section-level", sub: String(data.winston.sectionCount) },
        { label: "General", sub: String(data.winston.generalCount) },
      ],
      emptyMessage: "No Winston conversations recorded.",
      cta: "View engagement trends",
    },
    {
      cardId: "admin-integrations",
      title: "Integrations",
      href: "/admin/integrations",
      accent: C.integrations,
      icon: <Mail size={16} style={{ color: C.integrations }} />,
      stat: { label: "connected accounts", value: data.integrations.totalConnected },
      alert: data.integrations.flaggedCount > 0
        ? { label: "flagged tokens", count: data.integrations.flaggedCount }
        : null,
      items: [
        { label: "Gmail", sub: String(data.integrations.gmailCount) },
        { label: "Outlook", sub: String(data.integrations.outlookCount) },
      ],
      emptyMessage: "No email integrations connected.",
      cta: "View integration health",
    },
    {
      cardId: "admin-briefing",
      title: "Briefing Health",
      href: "/admin/briefing-health",
      accent: C.briefing,
      icon: <Activity size={16} style={{ color: C.briefing }} />,
      stat: { label: "last sent", value: relativeTime(data.briefing.lastSentAtISO) },
      items: [
        { label: "Delivered (36h)", sub: String(data.briefing.deliveredCount) },
        { label: "Pending (36h)", sub: String(data.briefing.pendingCount) },
      ],
      emptyMessage: "No briefings sent yet.",
      cta: "View briefing health",
    },
    {
      cardId: "admin-platform",
      title: "Platform Metrics",
      href: "/admin/platform-metrics",
      accent: C.platform,
      icon: <BarChart3 size={16} style={{ color: C.platform }} />,
      stat: { label: "total rows", value: data.platform.totalRows.toLocaleString() },
      items: data.platform.topTables.map((t) => ({
        label: t.name,
        sub: t.count.toLocaleString(),
      })),
      emptyMessage: "No platform data.",
      cta: "View full table breakdown",
    },
  ];

  const activeCard = cards.find((c) => c.cardId === expanded);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <SectionCard
            key={card.cardId}
            {...card}
            isExpanded={expanded === card.cardId}
            onExpand={() => setExpanded(card.cardId)}
          />
        ))}
      </div>

      <AnimatePresence>
        {activeCard ? (
          <SectionCardModal
            key={activeCard.cardId}
            {...activeCard}
            onClose={() => setExpanded(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
