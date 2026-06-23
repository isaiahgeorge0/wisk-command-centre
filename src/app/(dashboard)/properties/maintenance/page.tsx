import {
  getAllMaintenance,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { MaintenancePageClient } from "@/components/properties/maintenance-page-client";

export default async function PropertiesMaintenancePage() {
  const [tickets, properties] = await Promise.all([
    getAllMaintenance(),
    getProperties(),
  ]);

  return (
    <MaintenancePageClient tickets={tickets} properties={properties} />
  );
}
