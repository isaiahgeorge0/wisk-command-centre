import { Users } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesTenantsPage() {
  return (
    <PropertiesPlaceholder
      title="Tenants"
      description="Tenant records, tenancies, and deposits."
      icon={Users}
    />
  );
}
