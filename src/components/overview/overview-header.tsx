import { LayoutDashboard } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import type { OverviewHeaderContent } from "@/lib/overview/date";

type OverviewHeaderProps = {
  header: OverviewHeaderContent;
};

export function OverviewHeader({ header }: OverviewHeaderProps) {
  return (
    <PageHeader
      title={header.title}
      subtitle={header.subtitle}
      icon={<LayoutDashboard className="size-6 text-white" />}
      gradient
      gradientFrom="#c3ff32"
      gradientTo="#016c81"
    />
  );
}
