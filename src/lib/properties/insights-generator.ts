import type { SupabaseClient } from "@supabase/supabase-js";

import { cachedSystemPrompt } from "@/lib/ai/anthropic";
import { ANTHROPIC_TIMEOUT_MS } from "@/lib/ai/constants";
import { buildFinancialSummary } from "@/lib/properties/financial-summary";
import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import { daysUntilDate } from "@/lib/properties/format";
import { calculateReliabilityScore } from "@/lib/properties/reliability";
import type {
  MaintenanceTicket,
  Property,
  PropertyInsightContent,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";

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

export type ProPropertyPortfolioContext = PropertyPortfolioContext & {
  isProPlan: true;
  portfolioGrossYield: number | null;
  portfolioNetYield: number | null;
  propertyYields: Array<{
    name: string;
    grossYield: number | null;
    netYield: number | null;
    roi: number | null;
    monthlyRent: number | null;
    netIncome: number;
  }>;
  tenantReliabilityScores: Array<{
    tenantName: string;
    propertyName: string;
    grade: string;
    score: number;
    label: string;
    missedCount: number;
    lateCount: number;
  }>;
  totalNetIncomeAnnual: number;
  totalMortgageCostAnnual: number;
  totalInsuranceCostAnnual: number;
  totalMaintenanceCostAnnual: number;
  totalVacancyLoss: number;
  upcomingMortgageRenewals: Array<{
    propertyName: string;
    lender: string;
    daysUntil: number;
    monthlyPayment: number;
  }>;
  upcomingInsuranceRenewals: Array<{
    propertyName: string;
    insurer: string;
    daysUntil: number;
  }>;
  atRiskTenants: Array<{
    name: string;
    propertyName: string;
    grade: string;
  }>;
};

const FIGURES_CONTEXT_NOTE =
  "Figures above are context only — do not copy currency amounts, values, £ figures, percentages, scores, or \"k\" shorthand into any JSON field. Exact amounts are attached by the application from source data and shown in the UI.";

const BASE_SYSTEM_PROMPT = `You are Winston, an AI property management assistant for WISK. Analyse this landlord's portfolio and provide a structured digest.

Return a JSON object with these sections:
{
  portfolio_health: string,
  wins: string[],
  attention: string[],
  financial_snapshot: string,
  winstons_insight: string,
  maintenance_summary: string
}

Rules:
- Refer to properties and tenants by name — never restate currency amounts, values, £ figures, percentages, scores, or "k" shorthand in any field
- Do not invent, round, abbreviate, convert, or recalculate any figure. Exact amounts are attached by the application from source data and shown in the UI
- Do not mention rent totals, yields, or cost totals in prose — those are rendered separately from source data
- Keep the tone direct, premium, and practical

Return ONLY valid JSON. No markdown, no explanation.`;

const PRO_SYSTEM_APPENDIX = ` This landlord is on Properties Pro. You have access to yield analytics, tenant reliability scores, and detailed financial data. Provide specific, data-backed qualitative insights. Identify patterns and risks the landlord might not have noticed. Refer to properties and tenants by name — never restate currency amounts, values, £ figures, percentages, scores, or "k" shorthand. Do not invent, round, abbreviate, convert, or recalculate any figure. Exact amounts are attached by the application from source data and shown in the UI.`;

export function getSystemPrompt(isProPlan: boolean): string {
  if (!isProPlan) return BASE_SYSTEM_PROMPT;
  return BASE_SYSTEM_PROMPT + PRO_SYSTEM_APPENDIX;
}

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
    supabase
      .from("properties")
      .select("name, status, property_type, monthly_rent")
      .eq("user_id", userId),
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

export async function buildProPropertyPortfolioContext(
  userId: string,
  supabase: SupabaseClient
): Promise<ProPropertyPortfolioContext> {
  const base = await buildPropertyPortfolioContext(userId, supabase);

  const now = new Date();
  const paymentSince = new Date(now);
  paymentSince.setMonth(paymentSince.getMonth() - 24);
  const paymentSinceIso = paymentSince.toISOString().slice(0, 10);

  const [
    propertiesResult,
    paymentsResult,
    tenantsResult,
    mortgagesResult,
    insuranceResult,
    ticketsResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, name, monthly_rent, current_value, purchase_price, created_at, status, property_type"
      )
      .eq("user_id", userId),
    supabase
      .from("rent_payments")
      .select(
        "id, property_id, tenant_id, amount, due_date, paid_date, status"
      )
      .eq("user_id", userId)
      .gte("due_date", paymentSinceIso),
    supabase
      .from("tenants")
      .select("id, first_name, last_name, property_id, properties(name)")
      .eq("user_id", userId),
    supabase
      .from("property_mortgages")
      .select(
        "id, property_id, lender, monthly_payment, fixed_rate_end_date"
      )
      .eq("user_id", userId),
    supabase
      .from("property_insurance")
      .select("id, property_id, insurer, annual_premium, renewal_date")
      .eq("user_id", userId),
    supabase
      .from("maintenance_tickets")
      .select(
        "id, property_id, status, actual_cost, resolved_date, reported_date"
      )
      .eq("user_id", userId)
      .gte("reported_date", paymentSinceIso),
  ]);

  const properties = (propertiesResult.data ?? []) as Property[];
  const allPayments = (paymentsResult.data ?? []) as RentPayment[];
  const allMortgages = (mortgagesResult.data ?? []) as PropertyMortgage[];
  const allInsurance = (insuranceResult.data ?? []) as PropertyInsurance[];
  const allTickets = (ticketsResult.data ?? []) as MaintenanceTicket[];

  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.name])
  );

  const paymentsByProperty = new Map<string, RentPayment[]>();
  for (const payment of allPayments) {
    const list = paymentsByProperty.get(payment.property_id) ?? [];
    list.push(payment);
    paymentsByProperty.set(payment.property_id, list);
  }

  const mortgagesByProperty = new Map<string, PropertyMortgage[]>();
  for (const mortgage of allMortgages) {
    const list = mortgagesByProperty.get(mortgage.property_id) ?? [];
    list.push(mortgage);
    mortgagesByProperty.set(mortgage.property_id, list);
  }

  const insuranceByProperty = new Map<string, PropertyInsurance[]>();
  for (const record of allInsurance) {
    const list = insuranceByProperty.get(record.property_id) ?? [];
    list.push(record);
    insuranceByProperty.set(record.property_id, list);
  }

  const ticketsByProperty = new Map<string, MaintenanceTicket[]>();
  for (const ticket of allTickets) {
    const list = ticketsByProperty.get(ticket.property_id) ?? [];
    list.push(ticket);
    ticketsByProperty.set(ticket.property_id, list);
  }

  const propertyYields: ProPropertyPortfolioContext["propertyYields"] = [];
  let totalNetIncomeAnnual = 0;
  let totalMortgageCostAnnual = 0;
  let totalInsuranceCostAnnual = 0;
  let totalMaintenanceCostAnnual = 0;
  let totalVacancyLoss = 0;

  for (const property of properties) {
    const summary = buildFinancialSummary(
      property,
      paymentsByProperty.get(property.id) ?? [],
      mortgagesByProperty.get(property.id) ?? [],
      insuranceByProperty.get(property.id) ?? [],
      ticketsByProperty.get(property.id) ?? [],
      "annual"
    );

    propertyYields.push({
      name: property.name,
      grossYield: summary.gross_yield,
      netYield: summary.net_yield,
      roi: summary.roi,
      monthlyRent: property.monthly_rent,
      netIncome: summary.net_income,
    });

    totalNetIncomeAnnual += summary.net_income;
    totalMortgageCostAnnual += summary.mortgage_cost;
    totalInsuranceCostAnnual += summary.insurance_cost;
    totalMaintenanceCostAnnual += summary.maintenance_cost;
    totalVacancyLoss += summary.vacancy_loss;
  }

  const grossYields = propertyYields
    .map((item) => item.grossYield)
    .filter((value): value is number => value != null);
  const netYields = propertyYields
    .map((item) => item.netYield)
    .filter((value): value is number => value != null);

  const portfolioGrossYield =
    grossYields.length > 0
      ? grossYields.reduce((sum, value) => sum + value, 0) / grossYields.length
      : null;
  const portfolioNetYield =
    netYields.length > 0
      ? netYields.reduce((sum, value) => sum + value, 0) / netYields.length
      : null;

  const paymentsByTenant = new Map<string, RentPayment[]>();
  for (const payment of allPayments) {
    const list = paymentsByTenant.get(payment.tenant_id) ?? [];
    list.push(payment);
    paymentsByTenant.set(payment.tenant_id, list);
  }

  const tenantReliabilityScores: ProPropertyPortfolioContext["tenantReliabilityScores"] =
    [];

  for (const tenant of tenantsResult.data ?? []) {
    const props = tenant.properties as unknown as { name: string } | null;
    const tenantPayments = paymentsByTenant.get(tenant.id as string) ?? [];
    const score = calculateReliabilityScore(
      tenant.id as string,
      tenantPayments
    );

    tenantReliabilityScores.push({
      tenantName: `${tenant.first_name} ${tenant.last_name}`.trim(),
      propertyName: props?.name ?? "Unknown",
      grade: score.grade,
      score: score.score,
      label: score.label,
      missedCount: score.missedCount,
      lateCount: score.lateCount,
    });
  }

  const atRiskTenants = tenantReliabilityScores
    .filter((tenant) => tenant.grade === "D" || tenant.grade === "F")
    .map((tenant) => ({
      name: tenant.tenantName,
      propertyName: tenant.propertyName,
      grade: tenant.grade,
    }));

  const upcomingMortgageRenewals = allMortgages
    .map((mortgage) => {
      if (!mortgage.fixed_rate_end_date) return null;
      const daysUntil = daysUntilDate(mortgage.fixed_rate_end_date);
      if (daysUntil == null || daysUntil > 180 || daysUntil < 0) return null;
      return {
        propertyName:
          propertyNameById.get(mortgage.property_id) ?? "Unknown",
        lender: mortgage.lender,
        daysUntil,
        monthlyPayment: mortgage.monthly_payment,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> => item != null
    )
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const upcomingInsuranceRenewals = allInsurance
    .map((record) => {
      if (!record.renewal_date) return null;
      const daysUntil = daysUntilDate(record.renewal_date);
      if (daysUntil == null || daysUntil > 90 || daysUntil < 0) return null;
      return {
        propertyName:
          propertyNameById.get(record.property_id) ?? "Unknown",
        insurer: record.insurer,
        daysUntil,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> => item != null
    )
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    ...base,
    isProPlan: true,
    portfolioGrossYield,
    portfolioNetYield,
    propertyYields,
    tenantReliabilityScores,
    totalNetIncomeAnnual,
    totalMortgageCostAnnual,
    totalInsuranceCostAnnual,
    totalMaintenanceCostAnnual,
    totalVacancyLoss,
    upcomingMortgageRenewals,
    upcomingInsuranceRenewals,
    atRiskTenants,
  };
}

function buildBaseUserPrompt(ctx: PropertyPortfolioContext): string {
  const lines: string[] = [];
  lines.push(`Generate a property portfolio digest for ${ctx.userName}.`);
  lines.push(`Period: ${ctx.periodStart} to ${ctx.periodEnd}`);
  lines.push(`Properties: ${ctx.propertyCount}`);
  lines.push("");

  lines.push("## PROPERTIES");
  for (const p of ctx.properties.slice(0, 25)) {
    lines.push(
      `- ${p.name} (${p.type}, ${p.status})${p.monthlyRent != null ? `, rent £${p.monthlyRent}/mo` : ""}`
    );
  }
  if (ctx.properties.length > 25) {
    lines.push(`- …and ${ctx.properties.length - 25} more`);
  }
  lines.push("");

  lines.push("## TENANTS");
  for (const t of ctx.tenants.slice(0, 20)) {
    lines.push(`- ${t.name} at ${t.propertyName} (${t.status}), £${t.rentAmount}`);
  }
  if (ctx.tenants.length > 20) {
    lines.push(`- …and ${ctx.tenants.length - 20} more`);
  }
  if (ctx.tenants.length === 0) lines.push("- No tenants");
  lines.push("");

  lines.push("## OPEN MAINTENANCE");
  for (const m of ctx.openMaintenance.slice(0, 15)) {
    lines.push(
      `- [${m.priority}] ${m.title} at ${m.propertyName} (${m.status}${m.category ? `, ${m.category}` : ""})`
    );
  }
  if (ctx.openMaintenance.length > 15) {
    lines.push(`- …and ${ctx.openMaintenance.length - 15} more`);
  }
  if (ctx.openMaintenance.length === 0) lines.push("- No open tickets");
  lines.push("");

  lines.push("## RENT THIS MONTH (context only — do not restate these £ figures in output)");
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

function buildProUserPrompt(ctx: ProPropertyPortfolioContext): string {
  const lines = [buildBaseUserPrompt(ctx), ""];

  lines.push("## YIELD ANALYTICS (context only — do not restate these % figures in output)");
  lines.push(
    `Portfolio gross yield: ${ctx.portfolioGrossYield != null ? `${ctx.portfolioGrossYield.toFixed(1)}%` : "n/a"}`
  );
  lines.push(
    `Portfolio net yield: ${ctx.portfolioNetYield != null ? `${ctx.portfolioNetYield.toFixed(1)}%` : "n/a"}`
  );
  lines.push("Per property:");
  for (const property of ctx.propertyYields.slice(0, 25)) {
    lines.push(
      `- ${property.name}: gross ${property.grossYield != null ? `${property.grossYield.toFixed(1)}%` : "n/a"}, net ${property.netYield != null ? `${property.netYield.toFixed(1)}%` : "n/a"}, ROI ${property.roi != null ? `${property.roi.toFixed(1)}%` : "n/a"}, net income £${property.netIncome}/yr`
    );
  }
  if (ctx.propertyYields.length > 25) {
    lines.push(`- …and ${ctx.propertyYields.length - 25} more`);
  }
  lines.push("");

  lines.push("## TENANT RELIABILITY (context only — grades and scores are attached in code)");
  const reliabilitySorted = [...ctx.tenantReliabilityScores].sort((a, b) => {
    const gradeWeight: Record<string, number> = {
      F: 0,
      D: 1,
      C: 2,
      B: 3,
      A: 4,
    };
    return (gradeWeight[a.grade] ?? 5) - (gradeWeight[b.grade] ?? 5);
  });
  for (const tenant of reliabilitySorted.slice(0, 20)) {
    lines.push(
      `${tenant.tenantName} at ${tenant.propertyName}: Grade ${tenant.grade} (${tenant.score}/100) — ${tenant.label}. Missed: ${tenant.missedCount}, Late: ${tenant.lateCount}.`
    );
  }
  if (ctx.tenantReliabilityScores.length > 20) {
    lines.push(
      `…and ${ctx.tenantReliabilityScores.length - 20} more tenants`
    );
  }
  if (ctx.tenantReliabilityScores.length === 0) {
    lines.push("- No tenant payment history");
  }
  lines.push(
    `At-risk tenants (D/F): ${
      ctx.atRiskTenants.length > 0
        ? ctx.atRiskTenants
            .slice(0, 15)
            .map((tenant) => `${tenant.name} at ${tenant.propertyName} (${tenant.grade})`)
            .join(", ")
        : "none"
    }`
  );
  lines.push("");

  lines.push("## FINANCIAL OVERVIEW (context only — do not restate these £ figures in output)");
  lines.push(`Annual net income: £${ctx.totalNetIncomeAnnual}`);
  lines.push(`Mortgage costs: £${ctx.totalMortgageCostAnnual}/yr`);
  lines.push(`Insurance costs: £${ctx.totalInsuranceCostAnnual}/yr`);
  lines.push(`Maintenance costs: £${ctx.totalMaintenanceCostAnnual}/yr`);
  lines.push(`Vacancy loss: £${ctx.totalVacancyLoss}/yr`);
  lines.push("");

  lines.push("## RISK ALERTS");
  lines.push("Mortgage renewals within 180 days:");
  if (ctx.upcomingMortgageRenewals.length > 0) {
    for (const renewal of ctx.upcomingMortgageRenewals) {
      lines.push(
        `- ${renewal.lender} at ${renewal.propertyName}: ${renewal.daysUntil} days, £${renewal.monthlyPayment}/mo`
      );
    }
  } else {
    lines.push("- None");
  }
  lines.push("Insurance renewals within 90 days:");
  if (ctx.upcomingInsuranceRenewals.length > 0) {
    for (const renewal of ctx.upcomingInsuranceRenewals) {
      lines.push(
        `- ${renewal.insurer} at ${renewal.propertyName}: ${renewal.daysUntil} days`
      );
    }
  } else {
    lines.push("- None");
  }
  lines.push("");

  lines.push("---");
  lines.push(
    "Respond ONLY with valid JSON. Include the base fields plus these Pro fields. All strings are qualitative reasoning only — no currency, percentages, or scores:"
  );
  lines.push(`{`);
  lines.push(`  "portfolio_health": string,`);
  lines.push(`  "wins": string[],`);
  lines.push(`  "attention": string[],`);
  lines.push(`  "financial_snapshot": string,`);
  lines.push(`  "winstons_insight": string,`);
  lines.push(`  "maintenance_summary": string,`);
  lines.push(`  "yield_analysis": string,`);
  lines.push(`  "tenant_risk_summary": string,`);
  lines.push(`  "financial_health": string,`);
  lines.push(`  "risk_alerts": string[],`);
  lines.push(`  "property_deep_dives": [{ "propertyName": string, "insight": string }],`);
  lines.push(`  "pro_recommendations": string[]`);
  lines.push(`}`);

  return lines.join("\n");
}

function buildUserPrompt(
  context: PropertyPortfolioContext | ProPropertyPortfolioContext
): string {
  const body =
    "isProPlan" in context && context.isProPlan
      ? buildProUserPrompt(context)
      : buildBaseUserPrompt(context);
  return `${body}\n\n${FIGURES_CONTEXT_NOTE}`;
}

function isProContext(
  context: PropertyPortfolioContext | ProPropertyPortfolioContext
): context is ProPropertyPortfolioContext {
  return "isProPlan" in context && context.isProPlan === true;
}

function validateInsightShape(
  parsed: PropertyInsightContent,
  isProPlan: boolean
): void {
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

  if (!isProPlan) return;

  if (
    typeof parsed.yield_analysis !== "string" ||
    typeof parsed.tenant_risk_summary !== "string" ||
    typeof parsed.financial_health !== "string" ||
    !Array.isArray(parsed.risk_alerts) ||
    !Array.isArray(parsed.property_deep_dives) ||
    !Array.isArray(parsed.pro_recommendations)
  ) {
    throw new Error(
      "Claude response did not match Properties Pro insight shape"
    );
  }
}

function attachSourceValues(
  parsed: PropertyInsightContent,
  context: PropertyPortfolioContext | ProPropertyPortfolioContext
): PropertyInsightContent {
  const sourceFigures: PropertyInsightContent["sourceFigures"] = {
    rentPaidThisMonth: context.rentPayments.paidThisMonth,
    rentOutstandingThisMonth: context.rentPayments.outstandingThisMonth,
    rentTotalDueThisMonth: context.rentPayments.totalDueThisMonth,
  };

  if (!isProContext(context)) {
    return { ...parsed, sourceFigures };
  }

  sourceFigures.portfolioGrossYield = context.portfolioGrossYield;
  sourceFigures.portfolioNetYield = context.portfolioNetYield;
  sourceFigures.totalNetIncomeAnnual = context.totalNetIncomeAnnual;
  sourceFigures.totalMortgageCostAnnual = context.totalMortgageCostAnnual;
  sourceFigures.totalInsuranceCostAnnual = context.totalInsuranceCostAnnual;
  sourceFigures.totalMaintenanceCostAnnual = context.totalMaintenanceCostAnnual;
  sourceFigures.totalVacancyLoss = context.totalVacancyLoss;
  sourceFigures.atRiskTenants = context.atRiskTenants;
  sourceFigures.upcomingMortgageRenewals = context.upcomingMortgageRenewals;
  sourceFigures.upcomingInsuranceRenewals = context.upcomingInsuranceRenewals;

  const byName = new Map(
    context.propertyYields.map((property) => [
      property.name.toLowerCase(),
      property,
    ])
  );
  const allowedNames = new Set(byName.keys());

  const property_deep_dives = (parsed.property_deep_dives ?? [])
    .filter((dive) => allowedNames.has(dive.propertyName.toLowerCase()))
    .map((dive) => {
      const source = byName.get(dive.propertyName.toLowerCase());
      return {
        propertyName: source?.name ?? dive.propertyName,
        insight: dive.insight,
        monthlyRent: source?.monthlyRent ?? null,
        netIncome: source?.netIncome,
        grossYield: source?.grossYield ?? null,
        netYield: source?.netYield ?? null,
      };
    });

  return {
    ...parsed,
    sourceFigures,
    property_deep_dives,
  };
}

export type PropertyInsightResult = {
  content: PropertyInsightContent;
  inputTokens: number;
  outputTokens: number;
};

export async function generatePropertyInsights(
  context: PropertyPortfolioContext | ProPropertyPortfolioContext
): Promise<PropertyInsightResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const isProPlan = isProContext(context);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: isProPlan ? 2500 : 1500,
      system: cachedSystemPrompt(getSystemPrompt(isProPlan)),
      messages: [{ role: "user", content: buildUserPrompt(context) }],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
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
  validateInsightShape(parsed, isProPlan);

  return {
    content: attachSourceValues(parsed, context),
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
