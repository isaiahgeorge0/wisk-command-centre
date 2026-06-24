import { getPresenceLabel } from "@/lib/properties/format";
import { cn } from "@/lib/utils";

type PresenceLabelProps = {
  lastSeenAt: string | null;
  className?: string;
};

export function PresenceLabel({ lastSeenAt, className }: PresenceLabelProps) {
  const label = getPresenceLabel(lastSeenAt);
  if (!label) return null;

  const isOnline = label === "Online";

  return (
    <p
      className={cn(
        "text-xs",
        isOnline
          ? "text-green-600 dark:text-green-400"
          : "text-muted-foreground",
        className
      )}
    >
      {label}
    </p>
  );
}
