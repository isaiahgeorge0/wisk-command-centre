import { PoundSterling } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SectionSubNav } from "@/components/layout/section-sub-nav";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";

const SUB_NAV_ITEMS = [
  { label: "Overview", href: "/properties/finances" },
  { label: "Yield Analytics", href: "/properties/yield-analytics" },
  { label: "Reports", href: "/properties/reports" },
  { label: "SA105 Summary", href: "/properties/sa105" },
];

export default function FinancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title="Finances"
        subtitle="Rent payments, financial reports, yield analytics, and tax summary."
        icon={
          <PoundSterling
            className="size-6"
            style={{ color: PROPERTIES_ACCENT }}
          />
        }
      />

      <SectionSubNav items={SUB_NAV_ITEMS} />

      {children}
    </div>
  );
}
