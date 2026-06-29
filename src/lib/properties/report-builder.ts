import { isDateInTaxYear } from "@/lib/properties/tax-year";
import type {
  MaintenanceTicket,
  Property,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";

export type PropertyReportData = {
  property: Property;
  period: { start: Date; end: Date; label: string };
  totalRentExpected: number;
  totalRentCollected: number;
  vacancyLoss: number;
  mortgageCost: number;
  insuranceCost: number;
  maintenanceCost: number;
  totalCosts: number;
  netIncome: number;
  contractedNetIncome: number;
  grossYield: number | null;
  netYield: number | null;
  roi: number | null;
  payments: {
    paid: number;
    late: number;
    partial: number;
    missed: number;
    pending: number;
  };
  rentPayments: RentPayment[];
  mortgages: PropertyMortgage[];
  insurance: PropertyInsurance[];
  maintenanceTickets: MaintenanceTicket[];
};

export type PortfolioReportData = {
  period: { start: Date; end: Date; label: string };
  properties: PropertyReportData[];
  totalRentExpected: number;
  totalRentCollected: number;
  totalVacancyLoss: number;
  totalMortgageCost: number;
  totalInsuranceCost: number;
  totalMaintenanceCost: number;
  totalCosts: number;
  totalNetIncome: number;
  avgGrossYield: number | null;
  avgNetYield: number | null;
  occupancyRate: number;
};

function monthsInPeriod(start: Date, end: Date): number {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(1, months);
}

function sumPaidRentInPeriod(
  payments: RentPayment[],
  start: Date,
  end: Date
): number {
  return payments.reduce((sum, payment) => {
    if (payment.status !== "paid") return sum;
    const date = payment.paid_date ?? payment.due_date;
    if (!isDateInTaxYear(date, start, end)) return sum;
    return sum + payment.amount;
  }, 0);
}

function sumMaintenanceInPeriod(
  tickets: MaintenanceTicket[],
  start: Date,
  end: Date
): number {
  return tickets.reduce((sum, ticket) => {
    if (ticket.status !== "resolved" || !ticket.resolved_date) return sum;
    if (!isDateInTaxYear(ticket.resolved_date, start, end)) return sum;
    return sum + (ticket.actual_cost ?? 0);
  }, 0);
}

function filterPaymentsInPeriod(
  payments: RentPayment[],
  start: Date,
  end: Date
): RentPayment[] {
  return payments.filter((payment) =>
    isDateInTaxYear(payment.due_date, start, end)
  );
}

function filterResolvedTicketsInPeriod(
  tickets: MaintenanceTicket[],
  start: Date,
  end: Date
): MaintenanceTicket[] {
  return tickets.filter(
    (ticket) =>
      ticket.status === "resolved" &&
      ticket.resolved_date != null &&
      isDateInTaxYear(ticket.resolved_date, start, end)
  );
}

function countPaymentsByStatus(
  payments: RentPayment[],
  start: Date,
  end: Date
): PropertyReportData["payments"] {
  const counts = {
    paid: 0,
    late: 0,
    partial: 0,
    missed: 0,
    pending: 0,
  };

  for (const payment of payments) {
    if (!isDateInTaxYear(payment.due_date, start, end)) continue;
    if (payment.status in counts) {
      counts[payment.status as keyof typeof counts] += 1;
    }
  }

  return counts;
}

export function buildPropertyReport(
  property: Property,
  payments: RentPayment[],
  mortgages: PropertyMortgage[],
  insurance: PropertyInsurance[],
  tickets: MaintenanceTicket[],
  start: Date,
  end: Date,
  label: string
): PropertyReportData {
  const months = monthsInPeriod(start, end);
  const monthlyRent = property.monthly_rent ?? 0;

  const totalRentExpected = monthlyRent * months;
  const totalRentCollected = sumPaidRentInPeriod(payments, start, end);
  const vacancyLoss = Math.max(0, totalRentExpected - totalRentCollected);

  const mortgageCost = mortgages.reduce(
    (sum, mortgage) => sum + mortgage.monthly_payment * months,
    0
  );
  const insuranceCost = insurance.reduce(
    (sum, record) => sum + ((record.annual_premium ?? 0) / 12) * months,
    0
  );
  const maintenanceCost = sumMaintenanceInPeriod(tickets, start, end);
  const totalCosts = mortgageCost + insuranceCost + maintenanceCost;

  const netIncome = totalRentCollected - totalCosts;
  const contractedNetIncome = totalRentExpected - totalCosts;

  const contractedAnnualRent = monthlyRent * 12;
  const contractedNetIncomeAnnualised =
    contractedNetIncome * (12 / months);

  const grossYield =
    property.current_value && property.current_value > 0 && monthlyRent > 0
      ? (contractedAnnualRent / property.current_value) * 100
      : null;

  const netYield =
    property.current_value && property.current_value > 0 && monthlyRent > 0
      ? (contractedNetIncomeAnnualised / property.current_value) * 100
      : null;

  const roi =
    property.purchase_price && property.purchase_price > 0 && monthlyRent > 0
      ? (contractedNetIncomeAnnualised / property.purchase_price) * 100
      : null;

  return {
    property,
    period: { start, end, label },
    totalRentExpected,
    totalRentCollected,
    vacancyLoss,
    mortgageCost,
    insuranceCost,
    maintenanceCost,
    totalCosts,
    netIncome,
    contractedNetIncome,
    grossYield,
    netYield,
    roi,
    payments: countPaymentsByStatus(payments, start, end),
    rentPayments: filterPaymentsInPeriod(payments, start, end).sort(
      (a, b) =>
        new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    ),
    mortgages,
    insurance,
    maintenanceTickets: filterResolvedTicketsInPeriod(tickets, start, end),
  };
}

export function buildPortfolioReport(
  propertyReports: PropertyReportData[],
  period: { start: Date; end: Date; label: string }
): PortfolioReportData {
  const totalRentExpected = propertyReports.reduce(
    (sum, report) => sum + report.totalRentExpected,
    0
  );
  const totalRentCollected = propertyReports.reduce(
    (sum, report) => sum + report.totalRentCollected,
    0
  );
  const totalVacancyLoss = propertyReports.reduce(
    (sum, report) => sum + report.vacancyLoss,
    0
  );
  const totalMortgageCost = propertyReports.reduce(
    (sum, report) => sum + report.mortgageCost,
    0
  );
  const totalInsuranceCost = propertyReports.reduce(
    (sum, report) => sum + report.insuranceCost,
    0
  );
  const totalMaintenanceCost = propertyReports.reduce(
    (sum, report) => sum + report.maintenanceCost,
    0
  );
  const totalCosts = propertyReports.reduce(
    (sum, report) => sum + report.totalCosts,
    0
  );
  const totalNetIncome = propertyReports.reduce(
    (sum, report) => sum + report.netIncome,
    0
  );

  const grossYields = propertyReports
    .map((report) => report.grossYield)
    .filter((value): value is number => value != null);
  const netYields = propertyReports
    .map((report) => report.netYield)
    .filter((value): value is number => value != null);

  const avgGrossYield =
    grossYields.length > 0
      ? grossYields.reduce((sum, value) => sum + value, 0) / grossYields.length
      : null;
  const avgNetYield =
    netYields.length > 0
      ? netYields.reduce((sum, value) => sum + value, 0) / netYields.length
      : null;

  const occupiedCount = propertyReports.filter(
    (report) => report.property.status === "occupied"
  ).length;
  const occupancyRate =
    propertyReports.length > 0
      ? (occupiedCount / propertyReports.length) * 100
      : 0;

  return {
    period,
    properties: propertyReports,
    totalRentExpected,
    totalRentCollected,
    totalVacancyLoss,
    totalMortgageCost,
    totalInsuranceCost,
    totalMaintenanceCost,
    totalCosts,
    totalNetIncome,
    avgGrossYield,
    avgNetYield,
    occupancyRate,
  };
}
