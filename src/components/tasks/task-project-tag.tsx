import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TaskProjectTag({
  projectName,
  className,
}: {
  projectName: string | null;
  className?: string;
}) {
  if (!projectName) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-[140px] truncate border-wisk-section-tasks/25 bg-wisk-section-tasks/10 text-xs font-normal text-wisk-section-tasks",
        className
      )}
    >
      {projectName}
    </Badge>
  );
}
