import type { CalendarEventType } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

import { CALENDAR_TYPE_PILL_CLASS } from "@/lib/calendar/constants";

type CalendarEventPillProps = {
  type: CalendarEventType;
  label: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function CalendarEventPill({
  type,
  label,
  className,
  onClick,
}: CalendarEventPillProps) {
  const classNames = cn(
    "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
    CALENDAR_TYPE_PILL_CLASS[type],
    onClick && "cursor-pointer hover:opacity-90",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={cn("w-full text-left", classNames)}
        title={label}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={classNames} title={label}>
      {label}
    </span>
  );
}
