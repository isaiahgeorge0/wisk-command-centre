import type {
  CertificateType,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  PropertyStatus,
  PropertyType,
  RentPaymentStatus,
  TenantStatus,
} from "@/lib/properties/types";

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  gas_safety: "Gas Safety",
  epc: "EPC",
  eicr: "EICR",
  fire_alarm: "Fire Alarm",
  pat_testing: "PAT Testing",
  other: "Other",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  emergency: "Emergency",
};

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating: "Heating",
  structural: "Structural",
  appliance: "Appliance",
  other: "Other",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  flat: "Flat",
  house: "House",
  hmo: "HMO",
  commercial: "Commercial",
  other: "Other",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
  listed: "Listed",
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Active",
  notice: "Notice",
  ended: "Ended",
};

export const RENT_PAYMENT_STATUS_LABELS: Record<RentPaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  late: "Late",
  partial: "Partial",
  missed: "Missed",
};

export type PropertyDocumentType =
  | "lease"
  | "certificate"
  | "inspection"
  | "correspondence"
  | "other";

export const PROPERTY_DOCUMENT_TYPE_LABELS: Record<PropertyDocumentType, string> = {
  lease: "Lease Agreement",
  certificate: "Certificate",
  inspection: "Inspection Report",
  correspondence: "Correspondence",
  other: "Other",
};

export const CERTIFICATE_ALERT_TYPE_LABELS = {
  "90_days": "90 days",
  "30_days": "30 days",
  "7_days": "7 days",
  expired: "Expired",
} as const;

export function getCertificateTypeDisplayName(type: string | null | undefined): string {
  if (type && type in CERTIFICATE_TYPE_LABELS) {
    return CERTIFICATE_TYPE_LABELS[type as CertificateType];
  }
  return type?.replace(/_/g, " ") ?? "Unknown";
}

export function getMaintenanceStatusDisplayName(status: string | null | undefined): string {
  if (status && status in MAINTENANCE_STATUS_LABELS) {
    return MAINTENANCE_STATUS_LABELS[status as MaintenanceStatus];
  }
  return status?.replace(/_/g, " ") ?? "Unknown";
}

export function getMaintenancePriorityDisplayName(
  priority: string | null | undefined
): string {
  if (priority && priority in MAINTENANCE_PRIORITY_LABELS) {
    return MAINTENANCE_PRIORITY_LABELS[priority as MaintenancePriority];
  }
  return priority?.replace(/_/g, " ") ?? "Unknown";
}

export function getMaintenanceCategoryDisplayName(
  category: string | null | undefined
): string {
  if (category && category in MAINTENANCE_CATEGORY_LABELS) {
    return MAINTENANCE_CATEGORY_LABELS[category as MaintenanceCategory];
  }
  return category?.replace(/_/g, " ") ?? "Unknown";
}

export function getPropertyTypeDisplayName(type: string | null | undefined): string {
  if (type && type in PROPERTY_TYPE_LABELS) {
    return PROPERTY_TYPE_LABELS[type as PropertyType];
  }
  return type?.replace(/_/g, " ") ?? "Unknown";
}

export function getPropertyStatusDisplayName(status: string | null | undefined): string {
  if (status && status in PROPERTY_STATUS_LABELS) {
    return PROPERTY_STATUS_LABELS[status as PropertyStatus];
  }
  return status?.replace(/_/g, " ") ?? "Unknown";
}

export function getTenantStatusDisplayName(status: string | null | undefined): string {
  if (status && status in TENANT_STATUS_LABELS) {
    return TENANT_STATUS_LABELS[status as TenantStatus];
  }
  return status?.replace(/_/g, " ") ?? "Unknown";
}

export function getRentPaymentStatusDisplayName(status: string | null | undefined): string {
  if (status && status in RENT_PAYMENT_STATUS_LABELS) {
    return RENT_PAYMENT_STATUS_LABELS[status as RentPaymentStatus];
  }
  return status?.replace(/_/g, " ") ?? "Unknown";
}

export function getRentFrequencyDisplayName(
  frequency: string | null | undefined
): string {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "monthly") return "Monthly";
  return frequency?.replace(/_/g, " ") ?? "Unknown";
}

export function getPropertyDocumentTypeDisplayName(
  type: string | null | undefined
): string {
  if (type && type in PROPERTY_DOCUMENT_TYPE_LABELS) {
    return PROPERTY_DOCUMENT_TYPE_LABELS[type as PropertyDocumentType];
  }
  return type?.replace(/_/g, " ") ?? "Other";
}
