import { getInitials } from "@/lib/user/initials";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string | null;
  email: string;
  className?: string;
};

export function UserAvatar({ name, email, className }: UserAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <div
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-wisk-turquoise/20 to-wisk-turquoise/20 text-lg font-semibold text-foreground ring-2 ring-border/60",
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
