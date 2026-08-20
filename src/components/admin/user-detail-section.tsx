"use client";

import Link from "next/link";

import type {
  AIUsageByFeature,
  UserDetail,
  UserDetailIntegration,
  UserDetailProperties,
  UserDetailSubscription,
  UserDetailWinston,
} from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UserDetailSectionProps = {
  data: UserDetail;
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
};

const STATUS_CLASS: Record<string, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  trialing:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  cancelled:
    "border-border bg-muted text-muted-foreground",
  past_due:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

const FLAG_CLASS: Record<string, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  expired_token:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  expires_soon:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  missing_refresh_token:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  missing_expires_at:
    "border-border bg-muted text-muted-foreground",
};

function SubscriptionsSection({
  subscriptions,
}: {
  subscriptions: UserDetailSubscription[];
}) {
  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>No subscription history.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>
          Package history from user_subscriptions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Package</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Created</th>
              <th className="pb-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 font-medium">{sub.package}</td>
                <td className="py-2">
                  <Badge
                    variant="outline"
                    className={STATUS_CLASS[sub.status] ?? ""}
                  >
                    {sub.status}
                  </Badge>
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDate(sub.createdAt)}
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDate(sub.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AIUsageSection({
  aiUsage,
}: {
  aiUsage: UserDetail["aiUsage"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Usage (all-time)</CardTitle>
        <CardDescription>
          {formatTokens(aiUsage.totalInputTokens)} input ·{" "}
          {formatTokens(aiUsage.totalOutputTokens)} output ·{" "}
          {formatUSD(aiUsage.totalEstimatedCostUSD)} estimated
        </CardDescription>
      </CardHeader>
      {aiUsage.byFeature.length > 0 && (
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
              {aiUsage.byFeature.map((row: AIUsageByFeature) => (
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
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

function PropertiesSection({
  properties,
}: {
  properties: UserDetailProperties;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties</CardTitle>
        <CardDescription>
          {properties.propertyCount} properties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Overdue certificates
            </p>
            <p className="text-lg font-semibold">
              {properties.overdueCertificatesCount}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Open maintenance
            </p>
            <p className="text-lg font-semibold">
              {properties.openMaintenanceTicketsCount}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Missing rent data
            </p>
            <p className="text-lg font-semibold">
              {properties.missingRentDataCount}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WinstonSection({ winston }: { winston: UserDetailWinston }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Winston Conversations</CardTitle>
        <CardDescription>
          {winston.totalConversations} total conversations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Note-level</p>
            <p className="text-lg font-semibold">{winston.noteCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Section-level</p>
            <p className="text-lg font-semibold">{winston.sectionCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">General</p>
            <p className="text-lg font-semibold">{winston.generalCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsSection({
  integrations,
}: {
  integrations: UserDetailIntegration[];
}) {
  if (integrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>No email integrations connected.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Gmail / Outlook connection status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Provider</th>
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Connected</th>
              <th className="pb-2 font-medium">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((row: UserDetailIntegration, i: number) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 font-medium capitalize">{row.provider}</td>
                <td className="py-2 font-mono text-xs">
                  {row.accountEmail ?? "-"}
                </td>
                <td className="py-2">
                  <Badge
                    variant="outline"
                    className={FLAG_CLASS[row.flag] ?? ""}
                  >
                    {row.flag.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDate(row.connectedAt)}
                </td>
                <td className="py-2 text-muted-foreground">
                  {formatDate(row.lastSyncedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function UserDetailSection({ data }: UserDetailSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to users
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.name ?? data.email}</CardTitle>
          <CardDescription>
            {data.email} · Joined {formatDate(data.createdAt)} · Last sign-in{" "}
            {formatDate(data.lastSignInAt)}
          </CardDescription>
        </CardHeader>
      </Card>

      <SubscriptionsSection subscriptions={data.subscriptions} />
      <AIUsageSection aiUsage={data.aiUsage} />
      {data.properties && <PropertiesSection properties={data.properties} />}
      <WinstonSection winston={data.winston} />
      <IntegrationsSection integrations={data.integrations} />
    </div>
  );
}
