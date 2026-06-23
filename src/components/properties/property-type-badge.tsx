import { Badge } from "@/components/ui/badge";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
} from "@/lib/properties/constants";
import type { PropertyType } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

function normalizeType(type: string | null): PropertyType {
  if (type && PROPERTY_TYPES.includes(type as PropertyType)) {
    return type as PropertyType;
  }
  return "other";
}

export function PropertyTypeBadge({
  type,
  className,
}: {
  type: string | null;
  className?: string;
}) {
  const normalized = normalizeType(type);

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/60 bg-muted/30 font-medium text-muted-foreground",
        className
      )}
    >
      {PROPERTY_TYPE_LABELS[normalized]}
    </Badge>
  );
}
