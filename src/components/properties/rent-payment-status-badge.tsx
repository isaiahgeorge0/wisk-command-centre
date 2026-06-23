import { Badge } from "@/components/ui/badge";
import {
  RENT_PAYMENT_STATUS_BADGE_CLASS,
  RENT_PAYMENT_STATUS_LABELS,
  RENT_PAYMENT_STATUSES,
} from "@/lib/properties/constants";
import type { RentPaymentStatus } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

export function RentPaymentStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const normalized =
    status && RENT_PAYMENT_STATUSES.includes(status as RentPaymentStatus)
      ? (status as RentPaymentStatus)
      : "pending";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        RENT_PAYMENT_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {RENT_PAYMENT_STATUS_LABELS[normalized]}
    </Badge>
  );
}
