import { PROPERTY_STATUS_SORT_ORDER } from "@/lib/properties/constants";
import type {
  PortfolioStats,
  PropertyStatus,
  PropertyWithStats,
  RentPayment,
  RentPaymentStatus,
  RentPaymentWithDetails,
  Tenant,
  MaintenanceStatus,
  MaintenancePriority,
} from "@/lib/properties/types";
import { getTenantFullName } from "@/lib/properties/tenant-form";

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

function isCurrentMonth(dateStr: string, now = new Date()) {
  const date = new Date(dateStr);
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export type PropertyFinanceStats = {
  expectedThisMonth: number;
  receivedThisMonth: number;
  outstanding: number;
  totalReceivedAllTime: number;
};

export function buildPropertyFinanceStats(
  payments: RentPayment[]
): PropertyFinanceStats {
  const now = new Date();
  let expectedThisMonth = 0;
  let receivedThisMonth = 0;
  let outstanding = 0;
  let totalReceivedAllTime = 0;

  for (const payment of payments) {
    if (payment.status === "paid") {
      totalReceivedAllTime += payment.amount;
      if (
        isCurrentMonth(payment.paid_date ?? payment.due_date, now)
      ) {
        receivedThisMonth += payment.amount;
      }
    }

    if (isCurrentMonth(payment.due_date, now)) {
      expectedThisMonth += payment.amount;
      if (
        payment.status === "pending" ||
        payment.status === "late" ||
        payment.status === "partial" ||
        payment.status === "missed"
      ) {
        outstanding += payment.amount;
      }
    }
  }

  return {
    expectedThisMonth,
    receivedThisMonth,
    outstanding,
    totalReceivedAllTime,
  };
}

export type PortfolioFinanceStats = {
  totalMonthlyExpected: number;
  totalReceivedThisMonth: number;
  totalOutstanding: number;
  occupancyRate: number;
};

export function buildPortfolioFinanceStats(
  properties: PropertyWithStats[],
  payments: RentPayment[],
  tenants: Tenant[]
): PortfolioFinanceStats {
  const finance = buildPropertyFinanceStats(payments);
  const activeTenants = tenants.filter((t) => t.status === "active");
  const monthlyExpectedFromTenants = activeTenants.reduce((sum, tenant) => {
    if (tenant.rent_frequency === "monthly") return sum + tenant.rent_amount;
    return sum + tenant.rent_amount * 4;
  }, 0);

  const occupancyRate =
    properties.length === 0
      ? 0
      : Math.round((properties.filter((p) => p.status === "occupied").length / properties.length) * 100);

  return {
    totalMonthlyExpected:
      monthlyExpectedFromTenants > 0
        ? monthlyExpectedFromTenants
        : finance.expectedThisMonth,
    totalReceivedThisMonth: finance.receivedThisMonth,
    totalOutstanding: finance.outstanding,
    occupancyRate,
  };
}

export function groupPaymentsByProperty(
  payments: RentPaymentWithDetails[]
): Map<string, { propertyName: string; payments: RentPaymentWithDetails[] }> {
  const groups = new Map<string, { propertyName: string; payments: RentPaymentWithDetails[] }>();
  for (const payment of payments) {
    const existing = groups.get(payment.property_id);
    if (existing) {
      existing.payments.push(payment);
    } else {
      groups.set(payment.property_id, {
        propertyName: payment.property_name ?? "Property",
        payments: [payment],
      });
    }
  }
  return groups;
}

export function getPaymentTenantName(
  payment: RentPayment,
  tenants: Tenant[]
): string {
  const tenant = tenants.find((t) => t.id === payment.tenant_id);
  return tenant ? getTenantFullName(tenant) : "Unknown tenant";
}

export function filterPaymentsByStatus(
  payments: RentPaymentWithDetails[],
  status: RentPaymentStatus | "all"
): RentPaymentWithDetails[] {
  if (status === "all") return payments;
  return payments.filter((p) => p.status === status);
}

export function filterPaymentsByMonth(
  payments: RentPaymentWithDetails[],
  monthKey: string | "all"
): RentPaymentWithDetails[] {
  if (monthKey === "all") return payments;
  return payments.filter((p) => p.due_date.startsWith(monthKey));
}

export type MaintenancePortfolioStats = {
  totalOpen: number;
  urgentCount: number;
  resolvedThisMonth: number;
};

export function buildMaintenancePortfolioStats(
  tickets: { status: MaintenanceStatus; priority: MaintenancePriority; resolved_date: string | null }[]
): MaintenancePortfolioStats {
  const now = new Date();
  return {
    totalOpen: tickets.filter(
      (t) => t.status === "new" || t.status === "in_progress"
    ).length,
    urgentCount: tickets.filter(
      (t) =>
        (t.status === "new" || t.status === "in_progress") &&
        (t.priority === "emergency" || t.priority === "high")
    ).length,
    resolvedThisMonth: tickets.filter((t) => {
      if (t.status !== "resolved" || !t.resolved_date) return false;
      const date = new Date(t.resolved_date);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length,
  };
}
