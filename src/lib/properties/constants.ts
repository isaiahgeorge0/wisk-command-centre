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
