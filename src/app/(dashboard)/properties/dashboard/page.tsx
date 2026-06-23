import { LayoutDashboard } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesDashboardPage() {
  return (
    <PropertiesPlaceholder
      title="Dashboard"
      description="Portfolio overview and key metrics at a glance."
      icon={LayoutDashboard}
    />
  );
}
