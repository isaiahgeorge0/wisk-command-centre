export type TaxYearRange = {
  start: Date;
  end: Date;
  label: string;
};

function makeTaxYearRange(startYear: number): TaxYearRange {
  const start = new Date(startYear, 3, 6, 0, 0, 0, 0);
  const end = new Date(startYear + 1, 3, 5, 23, 59, 59, 999);
  const endYearShort = String(startYear + 1).slice(-2);
  return {
    start,
    end,
    label: `${startYear}/${endYearShort}`,
  };
}

export function getCurrentTaxYear(now = new Date()): TaxYearRange {
  const year = now.getFullYear();
  const aprilSix = new Date(year, 3, 6, 0, 0, 0, 0);
  if (now >= aprilSix) {
    return makeTaxYearRange(year);
  }
  return makeTaxYearRange(year - 1);
}

export function getLastTaxYear(now = new Date()): TaxYearRange {
  const current = getCurrentTaxYear(now);
  return makeTaxYearRange(current.start.getFullYear() - 1);
}

export function formatTaxYearLabel(start: Date, end: Date): string {
  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${format(start)} – ${format(end)}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateInTaxYear(
  dateStr: string,
  start: Date,
  end: Date
): boolean {
  const date = parseLocalDate(dateStr);
  date.setHours(0, 0, 0, 0);
  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setHours(23, 59, 59, 999);
  return date >= rangeStart && date <= rangeEnd;
}
