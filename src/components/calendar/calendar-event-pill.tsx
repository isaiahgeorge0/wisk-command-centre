import type { CalendarEventType } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

import { CALENDAR_TYPE_PILL_CLASS } from "@/lib/calendar/constants";

type CalendarEventPillProps = {
  type: CalendarEventType;
  label: string;
  className?: string;
};

export function CalendarEventPill({
  type,
  label,
  className,
}: CalendarEventPillProps) {
  return (
    <span
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        CALENDAR_TYPE_PILL_CLASS[type],
        className
      )}
      title={label}
    >
      {label}
    </span>
  );
}
