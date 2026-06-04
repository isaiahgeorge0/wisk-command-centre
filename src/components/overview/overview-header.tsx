import type { OverviewHeaderContent } from "@/lib/overview/date";

type OverviewHeaderProps = {
  header: OverviewHeaderContent;
};

export function OverviewHeader({ header }: OverviewHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {header.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {header.subtitle}
      </p>
    </header>
  );
}
