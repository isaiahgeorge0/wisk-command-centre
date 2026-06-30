import { POSSESSION_GROUNDS } from "@/lib/properties/legal-grounds";

export function calculateEarliestCourtDate(
  groundIds: string[],
  noticeServedDate: Date
): Date {
  const noticePeriods = groundIds.map((id) => {
    const ground = POSSESSION_GROUNDS.find((g) => g.id === id);
    return ground?.noticePeriodWeeks ?? 0;
  });

  const longestWeeks = Math.max(...noticePeriods, 0);

  const result = new Date(noticeServedDate);
  result.setDate(result.getDate() + longestWeeks * 7);
  return result;
}

export function isWithinProtectedPeriod(
  groundId: string,
  tenancyStartDate: Date,
  noticeServedDate: Date
): boolean {
  const ground = POSSESSION_GROUNDS.find((g) => g.id === groundId);
  if (!ground?.protectedPeriodMonths) return false;

  const protectedUntil = new Date(tenancyStartDate);
  protectedUntil.setMonth(
    protectedUntil.getMonth() + ground.protectedPeriodMonths
  );

  return noticeServedDate < protectedUntil;
}

export function getProtectedUntilDate(
  groundId: string,
  tenancyStartDate: Date
): Date | null {
  const ground = POSSESSION_GROUNDS.find((g) => g.id === groundId);
  if (!ground?.protectedPeriodMonths) return null;

  const protectedUntil = new Date(tenancyStartDate);
  protectedUntil.setMonth(
    protectedUntil.getMonth() + ground.protectedPeriodMonths
  );
  return protectedUntil;
}

type ArrearsPaymentInput = {
  status: string;
  amount: number;
  due_date: string;
};

export type ArrearsStatus = {
  totalArrears: number;
  monthsEquivalent: number;
  meetsGround8Threshold: boolean;
};

export function calculateArrearsStatus(
  payments: ArrearsPaymentInput[],
  rentFrequency: "weekly" | "monthly",
  rentAmount: number,
  asOfDate: Date
): ArrearsStatus {
  const asOfISO = asOfDate.toISOString().slice(0, 10);

  const totalArrears = payments.reduce((sum, payment) => {
    if (payment.due_date > asOfISO) return sum;
    if (payment.status === "missed") return sum + payment.amount;
    if (payment.status === "partial") {
      // Partial means some was paid; we count the full amount as arrears
      // since we don't track the shortfall separately — conservative estimate
      return sum + payment.amount;
    }
    return sum;
  }, 0);

  const monthlyRent =
    rentFrequency === "weekly" ? (rentAmount * 52) / 12 : rentAmount;

  const monthsEquivalent =
    monthlyRent > 0 ? totalArrears / monthlyRent : 0;

  let meetsGround8Threshold = false;
  if (rentFrequency === "monthly") {
    meetsGround8Threshold = monthsEquivalent >= 3;
  } else {
    // Weekly: need 13 weeks' rent
    meetsGround8Threshold =
      rentAmount > 0 && totalArrears >= rentAmount * 13;
  }

  return {
    totalArrears,
    monthsEquivalent: Math.round(monthsEquivalent * 10) / 10,
    meetsGround8Threshold,
  };
}

export type Form4ADateResult = {
  earliestStartDate: Date;
  warning: string | null;
};

export function calculateForm4ANewRentDate(
  tenancyStartDate: Date,
  lastIncreaseDate: Date | null,
  noticeServedDate: Date
): Form4ADateResult {
  // Requirement 1: at least 2 months from notice
  const twoMonthsFromNotice = new Date(noticeServedDate);
  twoMonthsFromNotice.setMonth(twoMonthsFromNotice.getMonth() + 2);

  // Requirement 2: 52 weeks after last increase (or tenancy start if never increased)
  const baseDate = lastIncreaseDate ?? tenancyStartDate;
  const fiftyTwoWeeksAfterBase = new Date(baseDate);
  fiftyTwoWeeksAfterBase.setDate(fiftyTwoWeeksAfterBase.getDate() + 52 * 7);

  // Take the later of the two
  let earliestStartDate =
    twoMonthsFromNotice > fiftyTwoWeeksAfterBase
      ? twoMonthsFromNotice
      : fiftyTwoWeeksAfterBase;

  // Align to the tenancy period: same day-of-month as tenancyStartDate
  const rentDay = tenancyStartDate.getDate();
  let warning: string | null = null;

  const currentDay = earliestStartDate.getDate();
  if (currentDay !== rentDay) {
    // Round forward to the next occurrence of rentDay
    const candidate = new Date(
      earliestStartDate.getFullYear(),
      earliestStartDate.getMonth(),
      rentDay
    );
    if (candidate < earliestStartDate) {
      // rentDay in this month is already past; go to next month
      candidate.setMonth(candidate.getMonth() + 1);
    }
    earliestStartDate = candidate;
    warning = `Adjusted to align with your tenancy period (rent due on the ${rentDay}${ordinalSuffix(rentDay)} of each month).`;
  }

  return { earliestStartDate, warning };
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

export function formatDateGB(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
