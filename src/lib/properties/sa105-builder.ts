import { computeAdjustedMonths } from "@/lib/properties/financial-summary";
import { formatPropertyCurrency } from "@/lib/properties/format";
import { isDateInTaxYear } from "@/lib/properties/tax-year";
import type {
  MaintenanceTicket,
  Property,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";

export type SA105Box = {
  boxNumber: string;
  label: string;
  amount: number;
  description: string;
};

export type SA105Insight = {
  type: "tip" | "warning" | "info";
  title: string;
  body: string;
};

export type SA105Summary = {
  taxYearLabel: string;
  periodStart: string;
  periodEnd: string;
  hasData: boolean;
  boxes: SA105Box[];
  netResult: number;
  profitOrLossBoxNumber: "38" | "41";
  profitOrLossAmount: number;
  isLoss: boolean;
  propertyIncomeAllowanceEligible: boolean;
  insights: SA105Insight[];
};

export const DOMESTIC_ITEM_KEYWORDS = [
  "replac",
  "fridge",
  "freezer",
  "washing machine",
  "washer",
  "dryer",
  "cooker",
  "oven",
  "microwave",
  "dishwasher",
  "carpet",
  "sofa",
  "mattress",
  "bed frame",
  "wardrobe",
  "curtain",
  "blind",
  "furniture",
  "appliance",
  "kettle",
  "toaster",
] as const;

export function isDomesticItemReplacementTicket(
  ticket: MaintenanceTicket
): boolean {
  const title = ticket.title.toLowerCase();
  const category = (ticket.category ?? "").toLowerCase();
  return DOMESTIC_ITEM_KEYWORDS.some(
    (keyword) => title.includes(keyword) || category.includes(keyword)
  );
}

export function getTicketResolvedDate(
  ticket: MaintenanceTicket
): string | null {
  return ticket.resolved_date ?? ticket.updated_at ?? null;
}

export function isResolvedTicketInPeriod(
  ticket: MaintenanceTicket,
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (ticket.status !== "resolved") return false;
  const resolvedDate = getTicketResolvedDate(ticket);
  if (!resolvedDate) return false;
  return isDateInTaxYear(resolvedDate, periodStart, periodEnd);
}

function sumBox20Income(
  payments: RentPayment[],
  periodStart: Date,
  periodEnd: Date
): number {
  return payments.reduce((sum, payment) => {
    if (payment.status !== "paid") return sum;
    const date = payment.paid_date ?? payment.due_date;
    if (!isDateInTaxYear(date, periodStart, periodEnd)) return sum;
    return sum + payment.amount;
  }, 0);
}

function sumBox24Insurance(
  properties: Property[],
  insurance: PropertyInsurance[],
  periodStart: Date,
  periodEnd: Date
): number {
  return properties.reduce((total, property) => {
    const adjustedMonths = computeAdjustedMonths(property, periodStart, periodEnd);
    const propertyInsurance = insurance.filter(
      (record) => record.property_id === property.id
    );
    return (
      total +
      propertyInsurance.reduce(
        (sum, record) =>
          sum + ((record.annual_premium ?? 0) / 12) * adjustedMonths,
        0
      )
    );
  }, 0);
}

function sumBox44MortgageInterest(
  properties: Property[],
  mortgages: PropertyMortgage[],
  periodStart: Date,
  periodEnd: Date
): number {
  return properties.reduce((total, property) => {
    const adjustedMonths = computeAdjustedMonths(property, periodStart, periodEnd);
    const propertyMortgages = mortgages.filter(
      (mortgage) => mortgage.property_id === property.id
    );
    return (
      total +
      propertyMortgages.reduce(
        (sum, mortgage) => sum + mortgage.monthly_payment * adjustedMonths,
        0
      )
    );
  }, 0);
}

function splitMaintenanceCosts(
  tickets: MaintenanceTicket[],
  periodStart: Date,
  periodEnd: Date
): { box25: number; box36: number } {
  let box25 = 0;
  let box36 = 0;

  for (const ticket of tickets) {
    if (!isResolvedTicketInPeriod(ticket, periodStart, periodEnd)) continue;
    const cost = ticket.actual_cost ?? 0;
    if (isDomesticItemReplacementTicket(ticket)) {
      box36 += cost;
    } else {
      box25 += cost;
    }
  }

  return { box25, box36 };
}

export function buildSA105Summary(
  properties: Property[],
  payments: RentPayment[],
  mortgages: PropertyMortgage[],
  insurance: PropertyInsurance[],
  tickets: MaintenanceTicket[],
  periodStart: Date,
  periodEnd: Date,
  taxYearLabel: string,
  manualBox27: number = 0,
  manualBox29: number = 0
): SA105Summary {
  const periodStartISO = periodStart.toISOString().slice(0, 10);
  const periodEndISO = periodEnd.toISOString().slice(0, 10);

  const box20 = sumBox20Income(payments, periodStart, periodEnd);
  const box24 = sumBox24Insurance(properties, insurance, periodStart, periodEnd);
  const { box25, box36 } = splitMaintenanceCosts(
    tickets,
    periodStart,
    periodEnd
  );
  const box27 = manualBox27;
  const box29 = manualBox29;
  const box44 = sumBox44MortgageInterest(
    properties,
    mortgages,
    periodStart,
    periodEnd
  );

  const g = box24 + box25 + box27 + box29;
  const netResult = box20 - (g + box36);

  const isLoss = netResult < 0;
  const profitOrLossBoxNumber: "38" | "41" = isLoss ? "41" : "38";
  const profitOrLossAmount = Math.abs(netResult);

  const hasData = properties.length > 0 && box20 > 0;
  const propertyIncomeAllowanceEligible = box20 < 1000;

  const expenseBoxes: SA105Box[] = [
    {
      boxNumber: "20",
      label: "Total rents and other income from property",
      amount: box20,
      description:
        "Total rent received across all properties in this period (paid payments only).",
    },
    {
      boxNumber: "24",
      label: "Rent, rates, insurance and ground rents",
      amount: box24,
      description:
        "Insurance premiums apportioned to this period using each property's active months.",
    },
    {
      boxNumber: "25",
      label: "Property repairs and maintenance",
      amount: box25,
      description:
        "Resolved maintenance costs in this period, excluding domestic item replacements (Box 36).",
    },
    {
      boxNumber: "27",
      label: "Legal, management and other professional fees",
      amount: box27,
      description:
        "Not tracked by WISK — add manually if you paid letting agent commission or legal fees.",
    },
    {
      boxNumber: "29",
      label: "Other allowable property expenses",
      amount: box29,
      description:
        "Not tracked by WISK — add manually if applicable (e.g. travel, phone, admin costs).",
    },
    {
      boxNumber: "36",
      label: "Costs of replacing domestic items — residential lettings only",
      amount: box36,
      description:
        "Maintenance records identified as appliance or furniture replacements rather than repairs.",
    },
    {
      boxNumber: profitOrLossBoxNumber,
      label: isLoss
        ? "Adjusted loss for the year"
        : "Adjusted profit for the year",
      amount: profitOrLossAmount,
      description: isLoss
        ? "Total income minus allowable expenses (Boxes 24, 25, 27, 29, and 36). Enter as a positive figure in Box 41."
        : "Total income minus allowable expenses (Boxes 24, 25, 27, 29, and 36).",
    },
    {
      boxNumber: "44",
      label: "Residential property finance costs",
      amount: box44,
      description:
        "Mortgage interest apportioned to this period. Not deducted from profit — generates a separate 20% tax credit.",
    },
  ];

  return {
    taxYearLabel,
    periodStart: periodStartISO,
    periodEnd: periodEndISO,
    hasData,
    boxes: expenseBoxes,
    netResult,
    profitOrLossBoxNumber,
    profitOrLossAmount,
    isLoss,
    propertyIncomeAllowanceEligible,
    insights: [],
  };
}

export function generateSA105Insights(
  summary: Pick<
    SA105Summary,
    "boxes" | "netResult" | "isLoss" | "propertyIncomeAllowanceEligible"
  >,
  domesticItemTicketCount: number,
  largeCostTicketCount: number
): SA105Insight[] {
  const insights: SA105Insight[] = [];
  const box36Amount =
    summary.boxes.find((box) => box.boxNumber === "36")?.amount ?? 0;
  const box44Amount =
    summary.boxes.find((box) => box.boxNumber === "44")?.amount ?? 0;

  if (summary.propertyIncomeAllowanceEligible) {
    insights.push({
      type: "tip",
      title: "You may qualify for the £1,000 property allowance",
      body: "Your total rental income for this period is under £1,000. You can claim the Property Income Allowance instead of itemising expenses, which exempts this income from tax entirely. If you choose this route, do not deduct any expenses on your return.",
    });
  }

  if (box44Amount > 0) {
    insights.push({
      type: "info",
      title: "Mortgage interest is a tax credit, not a deduction",
      body: `Your residential property finance costs of ${formatPropertyCurrency(box44Amount)} are not subtracted from your rental profit. Instead, HMRC applies a 20% tax credit against your tax bill, calculated separately. This is reported in Box 44 of the SA105, not as an expense.`,
    });
  }

  if (domesticItemTicketCount > 0) {
    insights.push({
      type: "tip",
      title: "Replacement of Domestic Items Relief identified",
      body: `WISK found ${domesticItemTicketCount} maintenance record(s) that look like item replacements (e.g. appliances, furniture) rather than repairs, totalling ${formatPropertyCurrency(box36Amount)}. These are claimed separately in Box 36 and are commonly under-claimed by landlords. Double-check this only includes genuine replacements (not the first-time purchase of an item) and that any upgrade is capped at the cost of a like-for-like equivalent.`,
    });
  }

  insights.push({
    type: "warning",
    title: "Letting agent and legal fees not included",
    body: "WISK doesn't currently track letting agent commission or legal fees as a separate field. If you paid these, add them manually to Box 27 before filing — they're a commonly claimed and often significant deduction.",
  });

  if (summary.isLoss) {
    insights.push({
      type: "info",
      title: "Your property business made a loss this period",
      body: "This loss can be carried forward indefinitely and offset against future UK property profits. It cannot be offset against other income such as employment or dividends.",
    });
  }

  if (largeCostTicketCount > 0) {
    insights.push({
      type: "warning",
      title: "Large repair costs — check for capital improvements",
      body: `${largeCostTicketCount} repair(s) in this period cost over £1,500. HMRC may query large repair figures. Make sure these were genuine repairs (restoring the property to its previous condition) rather than improvements (e.g. a new kitchen, an extension, or upgraded fittings beyond like-for-like), which are capital costs and not deductible against rental income.`,
    });
  }

  return insights;
}
