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
        "border-wisk-purple/25 bg-wisk-purple/10 text-xs font-normal text-wisk-purple",
        className
      )}
    >
      {category}
    </Badge>
  );
}
