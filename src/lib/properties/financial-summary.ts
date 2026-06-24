import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  FinancialSummary,
  MaintenanceTicket,
  PortfolioFinancialOverview,
  Property,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-GB",
    { month: "short", year: "2-digit" }
  );
}

function isDateInRange(
  dateStr: string | null | undefined,
  start: Date,
  end: Date
): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date >= start && date <= end;
}

function getPeriodRange(period: "monthly" | "annual", now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, months: 1 };
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return { start, end, months: 12 };
}

function sumPaidRentInRange(
  payments: RentPayment[],
  start: Date,
  end: Date
): number {
  return payments.reduce((sum, payment) => {
    if (payment.status !== "paid") return sum;
    const date = payment.paid_date ?? payment.due_date;
    if (!isDateInRange(date, start, end)) return sum;
    return sum + payment.amount;
  }, 0);
}

function sumMaintenanceInRange(
  tickets: MaintenanceTicket[],
  start: Date,
  end: Date
): number {
  return tickets.reduce((sum, ticket) => {
    if (ticket.status !== "resolved") return sum;
    const date = ticket.resolved_date ?? ticket.reported_date;
    if (!isDateInRange(date, start, end)) return sum;
    return sum + (ticket.actual_cost ?? 0);
  }, 0);
}

function buildMonthlyBreakdown(
  payments: RentPayment[],
  mortgages: PropertyMortgage[],
  insurance: PropertyInsurance[],
  tickets: MaintenanceTicket[],
  now = new Date()
): FinancialSummary["monthly_breakdown"] {
  const months: FinancialSummary["monthly_breakdown"] = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    );
    monthEnd.setHours(23, 59, 59, 999);

    const income = sumPaidRentInRange(payments, monthStart, monthEnd);
    const mortgageCost = mortgages.reduce(
      (sum, m) => sum + m.monthly_payment,
      0
    );
    const insuranceCost = insurance.reduce(
      (sum, record) => sum + (record.annual_premium ?? 0) / 12,
      0
    );
    const maintenanceCost = sumMaintenanceInRange(
      tickets,
      monthStart,
      monthEnd
    );
    const costs = mortgageCost + insuranceCost + maintenanceCost;

    months.push({
      month: monthLabel(monthKey(monthStart)),
      income,
      costs,
      net: income - costs,
    });
  }

  return months;
}

export function buildFinancialSummary(
  property: Property,
  payments: RentPayment[],
  mortgages: PropertyMortgage[],
  insurance: PropertyInsurance[],
  tickets: MaintenanceTicket[],
  period: "monthly" | "annual"
): FinancialSummary {
  const now = new Date();
  const { start, end, months } = getPeriodRange(period, now);

  const rentalIncome = sumPaidRentInRange(payments, start, end);
  const expectedIncome = (property.monthly_rent ?? 0) * months;
  const vacancyLoss = Math.max(0, expectedIncome - rentalIncome);

  const mortgageCost = mortgages.reduce(
    (sum, mortgage) => sum + mortgage.monthly_payment * months,
    0
  );
  const insuranceCost = insurance.reduce(
    (sum, record) => sum + ((record.annual_premium ?? 0) / 12) * months,
    0
  );
  const maintenanceCost = sumMaintenanceInRange(tickets, start, end);

  const totalCosts = mortgageCost + insuranceCost + maintenanceCost;
  const netIncome = rentalIncome - totalCosts;

  const annualiseFactor = period === "monthly" ? 12 : 1;
  const annualRentalIncome = rentalIncome * annualiseFactor;
  const annualNetIncome = netIncome * annualiseFactor;

  const grossYield =
    property.current_value && property.current_value > 0
      ? (annualRentalIncome / property.current_value) * 100
      : null;

  const netYield =
    property.current_value && property.current_value > 0
      ? (annualNetIncome / property.current_value) * 100
      : null;

  const roi =
    property.purchase_price && property.purchase_price > 0
      ? (annualNetIncome / property.purchase_price) * 100
      : null;

  return {
    property_id: property.id,
    period,
    rental_income: rentalIncome,
    expected_income: expectedIncome,
    vacancy_loss: vacancyLoss,
    mortgage_cost: mortgageCost,
    insurance_cost: insuranceCost,
    maintenance_cost: maintenanceCost,
    total_costs: totalCosts,
    net_income: netIncome,
    gross_yield: grossYield,
    net_yield: netYield,
    roi,
    monthly_breakdown: buildMonthlyBreakdown(
      payments,
      mortgages,
      insurance,
      tickets,
      now
    ),
  };
}

export async function fetchPropertyFinanceData(
  propertyId: string,
  userId: string,
  supabase: SupabaseClient
) {
  const [propertyResult, paymentsResult, mortgagesResult, insuranceResult, ticketsResult] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("rent_payments")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", userId),
      supabase
        .from("property_mortgages")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", userId),
      supabase
        .from("property_insurance")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", userId),
      supabase
        .from("maintenance_tickets")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", userId),
    ]);

  return {
    property: propertyResult.data as Property | null,
    payments: (paymentsResult.data ?? []) as RentPayment[],
    mortgages: (mortgagesResult.data ?? []) as PropertyMortgage[],
    insurance: (insuranceResult.data ?? []) as PropertyInsurance[],
    tickets: (ticketsResult.data ?? []) as MaintenanceTicket[],
  };
}

export function buildPortfolioFinancialOverview(
  summaries: Array<{ property: Property; annual: FinancialSummary }>
): PortfolioFinancialOverview {
  const totalNetIncomeMonthly = summaries.reduce(
    (sum, item) => sum + item.annual.net_income / 12,
    0
  );
  const totalNetIncomeAnnual = summaries.reduce(
    (sum, item) => sum + item.annual.net_income,
    0
  );

  const withYield = summaries.filter(
    (item) => item.annual.net_yield != null
  );
  const bestPerforming =
    withYield.length > 0
      ? withYield.reduce((best, item) =>
          (item.annual.net_yield ?? 0) > (best.annual.net_yield ?? 0)
            ? item
            : best
        )
      : null;

  const negativeNetIncomeProperties = summaries
    .filter((item) => item.annual.net_income < 0)
    .map((item) => ({
      propertyId: item.property.id,
      propertyName: item.property.name,
      netIncome: item.annual.net_income,
    }));

  return {
    totalNetIncomeMonthly,
    totalNetIncomeAnnual,
    bestPerforming: bestPerforming
      ? {
          propertyId: bestPerforming.property.id,
          propertyName: bestPerforming.property.name,
          netYield: bestPerforming.annual.net_yield ?? 0,
        }
      : null,
    negativeNetIncomeProperties,
  };
}
