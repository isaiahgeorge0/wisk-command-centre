import type { PropertyStatus, PropertyType } from "@/lib/properties/types";

export const PROPERTY_STATUSES: PropertyStatus[] = [
  "occupied",
  "vacant",
  "maintenance",
  "listed",
];

export const PROPERTY_TYPES: PropertyType[] = [
  "flat",
  "house",
  "hmo",
  "commercial",
  "other",
];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
  listed: "Listed",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  flat: "Flat",
  house: "House",
  hmo: "HMO",
  commercial: "Commercial",
  other: "Other",
};

export const PROPERTY_STATUS_BADGE_CLASS: Record<PropertyStatus, string> = {
  occupied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  vacant: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  maintenance: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  listed: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export const PROPERTY_STATUS_SORT_ORDER: Record<PropertyStatus, number> = {
  occupied: 0,
  vacant: 1,
  maintenance: 2,
  listed: 3,
};

export const PROPERTIES_ACCENT = "#f59e0b";

export const TENANT_STATUSES = ["active", "notice", "ended"] as const;
export const TENANT_STATUS_LABELS = {
  active: "Active",
  notice: "Notice",
  ended: "Ended",
} as const;
export const TENANT_STATUS_BADGE_CLASS = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  notice:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ended: "border-border/60 bg-muted/40 text-muted-foreground",
} as const;

export const MAINTENANCE_STATUSES = ["new", "in_progress", "resolved"] as const;
export const MAINTENANCE_STATUS_LABELS = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
} as const;
export const MAINTENANCE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "emergency",
] as const;
export const MAINTENANCE_PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  emergency: "Emergency",
} as const;
export const MAINTENANCE_PRIORITY_BADGE_CLASS = {
  emergency:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-border/60 bg-muted/40 text-muted-foreground",
} as const;
export const MAINTENANCE_CATEGORIES = [
  "plumbing",
  "electrical",
  "heating",
  "structural",
  "appliance",
  "other",
] as const;
export const MAINTENANCE_CATEGORY_LABELS = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating: "Heating",
  structural: "Structural",
  appliance: "Appliance",
  other: "Other",
} as const;

export const RENT_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "late",
  "partial",
  "missed",
] as const;
export const RENT_PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  paid: "Paid",
  late: "Late",
  partial: "Partial",
  missed: "Missed",
} as const;
export const RENT_PAYMENT_STATUS_BADGE_CLASS = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  late: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  partial:
    "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  missed:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
} as const;

export const CERTIFICATE_TYPES = [
  "gas_safety",
  "epc",
  "eicr",
  "fire_alarm",
  "pat_testing",
  "other",
] as const;
export const CERTIFICATE_TYPE_LABELS = {
  gas_safety: "Gas Safety",
  epc: "EPC",
  eicr: "EICR",
  fire_alarm: "Fire Alarm",
  pat_testing: "PAT Testing",
  other: "Other",
} as const;
