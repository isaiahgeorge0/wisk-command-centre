import type { SupabaseClient } from "@supabase/supabase-js";

import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import { daysUntilDate } from "@/lib/properties/format";
import type { PropertyInsightContent } from "@/lib/properties/types";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicContentBlock = AnthropicTextBlock | { type: string };
type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

export type PropertyPortfolioContext = {
  userId: string;
  userName: string;
  propertyCount: number;
  properties: Array<{
    name: string;
    status: string;
    type: string;
    monthlyRent: number | null;
  }>;
  tenants: Array<{
    name: string;
    propertyName: string;
    status: string;
    rentAmount: number;
  }>;
  openMaintenance: Array<{
    title: string;
    propertyName: string;
    priority: string;
    status: string;
    category: string | null;
  }>;
  rentPayments: {
    paidThisMonth: number;
    outstandingThisMonth: number;
    totalDueThisMonth: number;
  };
  expiringCertificates: Array<{
    propertyName: string;
    type: string;
    expiryDate: string;
    daysUntil: number;
  }>;
  periodStart: string;
  periodEnd: string;
};

const SYSTEM_PROMPT = `You are Winston, an AI property management assistant for WISK. Analyse this landlord's portfolio and provide a structured digest.

Return a JSON object with these sections:
{
  portfolio_health: string,
  wins: string[],
  attention: string[],
  financial_snapshot: string,
  winstons_insight: string,
  maintenance_summary: string
}

Return ONLY valid JSON. No markdown, no explanation.`;

export async function buildPropertyPortfolioContext(
  userId: string,
  supabase: SupabaseClient
): Promise<PropertyPortfolioContext> {
  const now = new Date();
  const periodEnd = now.toISOString().slice(0, 10);
  const periodStartDate = new Date(now);
  periodStartDate.setDate(periodStartDate.getDate() - 7);
  const periodStart = periodStartDate.toISOString().slice(0, 10);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [
    userResult,
    propertiesResult,
    tenantsResult,
    maintenanceResult,
    paymentsResult,
    certificatesResult,
  ] = await Promise.all([
    supabase.from("users").select("name, email").eq("id", userId).single(),
    supabase.from("properties").select("*").eq("user_id", userId),
    supabase
      .from("tenants")
      .select("first_name, last_name, status, rent_amount, properties(name)")
      .eq("user_id", userId),
    supabase
      .from("maintenance_tickets")
      .select("title, priority, status, category, properties(name)")
      .eq("user_id", userId)
      .neq("status", "resolved"),
    supabase
      .from("rent_payments")
      .select("amount, status")
      .eq("user_id", userId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
    supabase
      .from("property_certificates")
      .select("certificate_type, expiry_date, properties(name)")
      .eq("user_id", userId)
      .not("expiry_date", "is", null),
  ]);

  const userName =
    userResult.data?.name?.trim() ||
    userResult.data?.email?.split("@")[0] ||
    "Landlord";

  const properties = (propertiesResult.data ?? []).map((p) => ({
    name: p.name as string,
    status: p.status as string,
    type: p.property_type as string,
    monthlyRent: p.monthly_rent as number | null,
  }));

  const tenants = (tenantsResult.data ?? []).map((t) => {
    const props = t.properties as unknown as { name: string } | null;
    return {
      name: `${t.first_name} ${t.last_name}`.trim(),
      propertyName: props?.name ?? "Unknown",
      status: t.status as string,
      rentAmount: t.rent_amount as number,
    };
  });

  const openMaintenance = (maintenanceResult.data ?? []).map((m) => {
    const props = m.properties as unknown as { name: string } | null;
    return {
      title: m.title as string,
      propertyName: props?.name ?? "Unknown",
      priority: m.priority as string,
      status: m.status as string,
      category: m.category as string | null,
    };
  });

  let paidThisMonth = 0;
  let outstandingThisMonth = 0;
  for (const payment of paymentsResult.data ?? []) {
    const amount = payment.amount as number;
    if (payment.status === "paid") {
      paidThisMonth += amount;
    } else {
      outstandingThisMonth += amount;
    }
  }

  const expiringCertificates = (certificatesResult.data ?? [])
    .map((c) => {
      const expiryDate = c.expiry_date as string;
      const daysUntil = daysUntilDate(expiryDate);
      const props = c.properties as unknown as { name: string } | null;
      return {
        propertyName: props?.name ?? "Unknown",
        type: getCertificateTypeDisplayName(c.certificate_type as string),
        expiryDate,
        daysUntil: daysUntil ?? 999,
      };
    })
    .filter((c) => c.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    userId,
    userName,
    propertyCount: properties.length,
    properties,
    tenants,
    openMaintenance,
    rentPayments: {
      paidThisMonth,
      outstandingThisMonth,
      totalDueThisMonth: paidThisMonth + outstandingThisMonth,
    },
    expiringCertificates,
    periodStart,
    periodEnd,
  };
}

function buildUserPrompt(ctx: PropertyPortfolioContext): string {
  const lines: string[] = [];
  lines.push(`Generate a property portfolio digest for ${ctx.userName}.`);
  lines.push(`Period: ${ctx.periodStart} to ${ctx.periodEnd}`);
  lines.push(`Properties: ${ctx.propertyCount}`);
  lines.push("");

  lines.push("## PROPERTIES");
  for (const p of ctx.properties) {
    lines.push(
      `- ${p.name} (${p.type}, ${p.status})${p.monthlyRent != null ? `, rent £${p.monthlyRent}/mo` : ""}`
    );
  }
  lines.push("");

  lines.push("## TENANTS");
  for (const t of ctx.tenants) {
    lines.push(`- ${t.name} at ${t.propertyName} (${t.status}), £${t.rentAmount}`);
  }
  if (ctx.tenants.length === 0) lines.push("- No tenants");
  lines.push("");

  lines.push("## OPEN MAINTENANCE");
  for (const m of ctx.openMaintenance) {
    lines.push(
      `- [${m.priority}] ${m.title} at ${m.propertyName} (${m.status}${m.category ? `, ${m.category}` : ""})`
    );
  }
  if (ctx.openMaintenance.length === 0) lines.push("- No open tickets");
  lines.push("");

  lines.push("## RENT THIS MONTH");
  lines.push(`Paid: £${ctx.rentPayments.paidThisMonth}`);
  lines.push(`Outstanding: £${ctx.rentPayments.outstandingThisMonth}`);
  lines.push(`Total due: £${ctx.rentPayments.totalDueThisMonth}`);
  lines.push("");

  lines.push("## CERTIFICATES EXPIRING WITHIN 90 DAYS");
  for (const c of ctx.expiringCertificates) {
    lines.push(`- ${c.type} at ${c.propertyName}, expires ${c.expiryDate} (${c.daysUntil} days)`);
  }
  if (ctx.expiringCertificates.length === 0) {
    lines.push("- None expiring soon");
  }

  return lines.join("\n");
}

export type PropertyInsightResult = {
  content: PropertyInsightContent;
  inputTokens: number;
  outputTokens: number;
};

export async function generatePropertyInsights(
  context: PropertyPortfolioContext
): Promise<PropertyInsightResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(context) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as AnthropicResponse;
  const firstBlock = json.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Anthropic response did not contain a text block");
  }

  let raw = (firstBlock as AnthropicTextBlock).text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(raw) as PropertyInsightContent;
  if (
    typeof parsed.portfolio_health !== "string" ||
    !Array.isArray(parsed.wins) ||
    !Array.isArray(parsed.attention) ||
    typeof parsed.financial_snapshot !== "string" ||
    typeof parsed.winstons_insight !== "string" ||
    typeof parsed.maintenance_summary !== "string"
  ) {
    throw new Error("Claude response did not match PropertyInsightContent shape");
  }

  return {
    content: parsed,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

export function startOfWeekUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

export function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
