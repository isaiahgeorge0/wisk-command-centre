import { FileText } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesDocumentsPage() {
  return (
    <PropertiesPlaceholder
      title="Documents"
      description="Leases, certificates, and property files."
      icon={FileText}
    />
  );
}
