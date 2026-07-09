import { ONBOARDING_SLIDE_COUNT } from "@/lib/onboarding/slides";
import { cn } from "@/lib/utils";

type OnboardingProgressDotsProps = {
  current: number;
};

export function OnboardingProgressDots({ current }: OnboardingProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: ONBOARDING_SLIDE_COUNT }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            index === current ? "bg-wisk-turquoise" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
