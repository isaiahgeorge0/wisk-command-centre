import {
  getAllRentPayments,
  getExpiringCertificates,
  getLatestPropertyInsight,
  getMaintenanceTickets,
  getPendingAccessRequests,
  getProperties,
  getRentDueFlags,
  getTotalUnreadMessageCount,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesDashboardClient } from "@/components/properties/properties-dashboard-client";
import { buildPortfolioStats } from "@/lib/properties/selectors";

export default async function PropertiesDashboardPage() {
  const [
    properties,
    latestInsight,
    rentDueFlags,
    payments,
    maintenanceTickets,
    unreadMessageCount,
    expiringCertificates,
    pendingAccessRequests,
  ] = await Promise.all([
    getProperties(),
    getLatestPropertyInsight(),
    getRentDueFlags(),
    getAllRentPayments(),
    getMaintenanceTickets(),
    getTotalUnreadMessageCount(),
    getExpiringCertificates(90),
    getPendingAccessRequests(),
  ]);

  const stats = buildPortfolioStats(properties, payments);

  return (
    <PropertiesDashboardClient
      properties={properties}
      latestInsight={latestInsight}
      rentDueFlags={rentDueFlags}
      rentDueThisMonth={stats.rentDueThisMonth}
      openMaintenanceTickets={maintenanceTickets.filter(
        (t) => t.status !== "resolved"
      )}
      unreadMessageCount={unreadMessageCount}
      expiringCertificates={expiringCertificates}
      pendingAccessRequests={pendingAccessRequests}
    />
  );
}
