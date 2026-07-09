import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GoalCategoryTag({
  category,
  className,
}: {
  category: string | null;
  className?: string;
}) {
  if (!category?.trim()) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-wisk-section-goals/25 bg-wisk-section-goals/10 text-xs font-normal text-wisk-section-goals",
        className
      )}
    >
      {category}
    </Badge>
  );
}
