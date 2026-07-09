import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IdeaCategoryTag({
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
        "border-wisk-section-ideas/25 bg-wisk-section-ideas/10 text-xs font-normal text-wisk-section-ideas",
        className
      )}
    >
      {category}
    </Badge>
  );
}
