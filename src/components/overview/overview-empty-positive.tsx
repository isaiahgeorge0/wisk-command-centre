import { Sparkles } from "lucide-react";

export function OverviewEmptyPositive() {
  return (
    <div className="rounded-xl border border-wisk-teal/25 bg-wisk-teal/5 px-6 py-8 text-center">
      <Sparkles className="mx-auto mb-3 size-8 text-wisk-teal" />
      <p className="text-base font-medium text-foreground">
        You&apos;re on top of everything
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        No overdue tasks, missing next actions, or stalled goals — keep this
        momentum going.
      </p>
    </div>
  );
}
