"use client";

import { useEffect, useState } from "react";

import { getPresenceLabel } from "@/lib/properties/format";
import { cn } from "@/lib/utils";

type PresenceLabelProps = {
  lastSeenAt: string | null;
  className?: string;
};

export function PresenceLabel({ lastSeenAt, className }: PresenceLabelProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(getPresenceLabel(lastSeenAt));
    const interval = setInterval(() => {
      setLabel(getPresenceLabel(lastSeenAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSeenAt]);

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
      suppressHydrationWarning
    >
      {label}
    </p>
  );
}
