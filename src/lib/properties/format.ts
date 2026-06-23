import type { Property } from "@/lib/properties/types";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseOptionalNumber(
  value: string | number | undefined
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPropertyCurrency(
  value: number | null | undefined
): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPropertyAddress(property: Pick<
  Property,
  "address_line1" | "address_line2" | "city" | "postcode"
>): string {
  const parts = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

export function calculateAnnualYield(
  monthlyRent: number | null,
  purchasePrice: number | null
): number | null {
  if (
    monthlyRent == null ||
    purchasePrice == null ||
    purchasePrice <= 0
  ) {
    return null;
  }
  return ((monthlyRent * 12) / purchasePrice) * 100;
}

export function formatYieldPercent(yieldPercent: number | null): string {
  if (yieldPercent == null) return "—";
  return `${yieldPercent.toFixed(1)}%`;
}
