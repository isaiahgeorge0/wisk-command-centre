import type { CertificateType, PropertyType } from "@/lib/properties/types";

export type CertificateDuration = {
  years: number;
  note: string | null;
};

export function getCertificateDuration(
  certificateType: CertificateType,
  propertyType: PropertyType
): CertificateDuration | null {
  switch (certificateType) {
    case "gas_safety":
      return { years: 1, note: null };
    case "epc":
      return { years: 10, note: null };
    case "eicr":
      if (propertyType === "hmo") {
        return {
          years: 3,
          note: "EICR certificates for HMO properties must be renewed every 3 years, compared to 5 years for standard properties. This is due to the higher occupancy and shared facilities in HMOs.",
        };
      }
      return {
        years: 5,
        note: "EICR certificates for standard properties must be renewed every 5 years. Note: HMO properties require renewal every 3 years.",
      };
    case "fire_alarm":
      return { years: 1, note: null };
    case "pat_testing":
      return {
        years: 1,
        note: "PAT testing frequency is not legally fixed but 1 year is the recommended standard for rental properties.",
      };
    case "other":
      return null;
    default:
      return null;
  }
}

export function calculateExpiryDate(issueDate: string, years: number): string {
  const [year, month, day] = issueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setFullYear(date.getFullYear() + years);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
