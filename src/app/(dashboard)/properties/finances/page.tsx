import { PoundSterling } from "lucide-react";

import { PropertiesPlaceholder } from "@/components/properties/properties-placeholder";

export default function PropertiesFinancesPage() {
  return (
    <PropertiesPlaceholder
      title="Finances"
      description="Rent payments, arrears, and financial tracking."
      icon={PoundSterling}
    />
  );
}
