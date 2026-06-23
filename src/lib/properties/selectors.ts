import { PROPERTY_STATUS_SORT_ORDER } from "@/lib/properties/constants";
import type {
  PortfolioStats,
  PropertyStatus,
  PropertyWithStats,
} from "@/lib/properties/types";

export function buildPortfolioStats(
  properties: PropertyWithStats[]
): PortfolioStats {
  const occupied = properties.filter((p) => p.status === "occupied");
  const vacant = properties.filter((p) => p.status === "vacant");

  return {
    totalProperties: properties.length,
    occupiedCount: occupied.length,
    vacantCount: vacant.length,
    totalMonthlyRent: occupied.reduce(
      (sum, property) => sum + (property.monthly_rent ?? 0),
      0
    ),
    openMaintenanceCount: properties.reduce(
      (sum, property) => sum + property.open_maintenance_count,
      0
    ),
  };
}

export function sortPropertiesByStatus(
  properties: PropertyWithStats[]
): PropertyWithStats[] {
  return [...properties].sort((a, b) => {
    const statusDiff =
      PROPERTY_STATUS_SORT_ORDER[a.status as PropertyStatus] -
      PROPERTY_STATUS_SORT_ORDER[b.status as PropertyStatus];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}
