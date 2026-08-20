"use client";

import { useState, useTransition } from "react";

import { refreshAIUsageBreakdown } from "@/app/(dashboard)/admin/actions";
import type {
  AIUsageBreakdown,
  AIUsageByFeature,
  AIUsageByModel,
  AIUsageByProvider,
  AIUsageTopUser,
} from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AIUsageSectionProps = {
  initialData: AIUsageBreakdown;
};

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

const FEATURE_LABELS: Record<string, string> = {
  chat: "Winston Chat",
  digest: "AI Digest",
  email_draft: "Email Draft",
  property_insights: "Property Insights",
  email_picks_draft: "Email Picks Draft",
  pipeline_health: "Pipeline Health",
  portal_triage: "Portal Triage",
  property_valuation: "Property Valuation",
  morning_briefing: "Morning Briefing",
  lead_research_brief: "Lead Research Brief",
  research_competitor_check: "Research Competitor Check",
  research_place_lookup: "Research Place Lookup",
  research_open_chat: "Research Open Chat",
  lead_auto_enrichment: "Lead auto-enrichment",
  research_document_analysis: "Research document analysis",
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  tavily: "Tavily",
  exa: "Exa",
  google_places: "Google Places",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function AIUsageSection({ initialData }: AIUsageSectionProps) {
  const [data, setData] = useState(initialData);
  const [dateFrom, setDateFrom] = useState(data.dateFrom);
  const [dateTo, setDateTo] = useState(data.dateTo);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshAIUsageBreakdown(dateFrom, dateTo);
      if (result.success && result.data) {
        setData(result.data);
      } else if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <label
              htmlFor="ai-usage-from"
              className="text-sm font-medium text-muted-foreground"
            >
              From
            </label>
            <input
              id="ai-usage-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="ai-usage-to"
              className="text-sm font-medium text-muted-foreground"
            >
              To
            </label>
            <input
              id="ai-usage-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFrom(startOfMonthISO());
              setDateTo(todayISO());
            }}
          >
            This month
          </Button>
          <Button size="sm" onClick={handleRefresh} disabled={isPending}>
            {isPending ? "Loading…" : "Apply"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Input Tokens</CardDescription>
            <CardTitle className="text-2xl">
              {formatTokens(data.totalInputTokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Output Tokens</CardDescription>
            <CardTitle className="text-2xl">
              {formatTokens(data.totalOutputTokens)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Cost</CardDescription>
            <CardTitle className="text-2xl">
              {formatUSD(data.totalEstimatedCostUSD)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* By model */}
      <Card>
        <CardHeader>
          <CardTitle>By Model</CardTitle>
          <CardDescription>
            Model is inferred from feature, chat and morning briefing use Sonnet
            (paid) or Haiku (free); cost shown is conservative upper bound.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 text-right font-medium">Input</th>
                <th className="pb-2 text-right font-medium">Output</th>
                <th className="pb-2 text-right font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((row: AIUsageByModel) => (
                <tr key={row.model} className="border-b last:border-0">
                  <td className="py-2">{row.model}</td>
                  <td className="py-2 text-right">
                    {formatTokens(row.inputTokens)}
                  </td>
                  <td className="py-2 text-right">
                    {formatTokens(row.outputTokens)}
                  </td>
                  <td className="py-2 text-right">
                    {formatUSD(row.estimatedCostUSD)}
                  </td>
                </tr>
              ))}
              {data.byModel.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No usage in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Spend</CardTitle>
          <CardDescription>
            Includes estimated external vendor costs from `ai_usage_log.provider` and
            `external_cost_usd`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 text-right font-medium">Calls</th>
                <th className="pb-2 text-right font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.byProvider.map((row: AIUsageByProvider) => (
                <tr key={row.provider} className="border-b last:border-0">
                  <td className="py-2">
                    {PROVIDER_LABELS[row.provider] ?? row.provider}
                  </td>
                  <td className="py-2 text-right">{row.rowCount.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    {formatUSD(row.estimatedCostUSD)}
                  </td>
                </tr>
              ))}
              {data.byProvider.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    No usage in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* By feature/surface */}
      <Card>
        <CardHeader>
          <CardTitle>By Feature / Surface</CardTitle>
          <CardDescription>
            Tracked via the feature column in ai_usage_log, attribution is per-API-call.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 text-right font-medium">Calls</th>
                <th className="pb-2 text-right font-medium">Input</th>
                <th className="pb-2 text-right font-medium">Output</th>
                <th className="pb-2 text-right font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.byFeature.map((row: AIUsageByFeature) => (
                <tr key={row.feature} className="border-b last:border-0">
                  <td className="py-2">
                    {FEATURE_LABELS[row.feature] ?? row.feature}
                  </td>
                  <td className="py-2 text-right">
                    {row.rowCount.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    {formatTokens(row.inputTokens)}
                  </td>
                  <td className="py-2 text-right">
                    {formatTokens(row.outputTokens)}
                  </td>
                  <td className="py-2 text-right">
                    {formatUSD(row.estimatedCostUSD)}
                  </td>
                </tr>
              ))}
              {data.byFeature.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No usage in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Estimated Cost</CardTitle>
          <CardDescription>Top 20 users in the selected date range.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 text-right font-medium">Tokens</th>
                <th className="pb-2 text-right font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((user: AIUsageTopUser, i: number) => (
                <tr key={user.userId} className="border-b last:border-0">
                  <td className="py-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 font-mono text-xs">
                    {user.email ?? user.userId}
                  </td>
                  <td className="py-2 text-right">
                    {formatTokens(user.totalTokens)}
                  </td>
                  <td className="py-2 text-right">
                    {formatUSD(user.estimatedCostUSD)}
                  </td>
                </tr>
              ))}
              {data.topUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No usage in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
