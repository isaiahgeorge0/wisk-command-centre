import type { LucideIcon } from "lucide-react";

type OverviewInlineEmptyProps = {
  icon: LucideIcon;
  children: React.ReactNode;
};

export function OverviewInlineEmpty({ icon: Icon, children }: OverviewInlineEmptyProps) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon className="mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
