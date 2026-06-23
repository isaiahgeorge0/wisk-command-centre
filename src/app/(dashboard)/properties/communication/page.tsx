import { MessageSquare } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesCommunicationPage() {
  return (
    <PropertiesPlaceholder
      title="Communication"
      description="Tenant messaging and correspondence."
      icon={MessageSquare}
    />
  );
}
