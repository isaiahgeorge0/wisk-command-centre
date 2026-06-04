import type { OverviewHeaderContent } from "@/lib/overview/date";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type OverviewHeaderProps = {
  header: OverviewHeaderContent;
};

export function OverviewHeader({ header }: OverviewHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className={PAGE_TITLE_CLASS}>{header.title}</h1>
      <p className={cn("mt-2 max-w-2xl", PAGE_SUBTITLE_CLASS)}>
        {header.subtitle}
      </p>
    </header>
  );
}
