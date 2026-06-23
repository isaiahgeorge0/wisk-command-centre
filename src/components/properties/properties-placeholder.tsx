import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

type PropertiesPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function PropertiesPlaceholder({
  title,
  description,
  icon: Icon,
}: PropertiesPlaceholderProps) {
  return (
    <div className="py-6">
      <PageHeader
        title={title}
        subtitle={description}
        icon={<Icon className="size-6 text-amber-500" />}
        accentColour="#f59e0b"
      />
      <div className="mt-8 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">This section is being built.</p>
      </div>
    </div>
  );
}
