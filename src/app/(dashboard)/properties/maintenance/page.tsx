import { Wrench } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesMaintenancePage() {
  return (
    <PropertiesPlaceholder
      title="Maintenance"
      description="Track tickets, contractors, and repair costs."
      icon={Wrench}
    />
  );
}
