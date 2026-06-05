import type { OnboardingSlide } from "@/lib/onboarding/slides";
import { cn } from "@/lib/utils";

import { OnboardingWelcomeIntro } from "@/components/onboarding/onboarding-welcome-intro";

type OnboardingSlideContentProps = {
  slide: OnboardingSlide;
  onWelcomeIntroComplete?: () => void;
};

export function OnboardingSlideContent({
  slide,
  onWelcomeIntroComplete,
}: OnboardingSlideContentProps) {
  const Icon = slide.icon;

  if (slide.kind === "welcome") {
    return (
      <OnboardingWelcomeIntro
        onIntroComplete={onWelcomeIntroComplete ?? (() => {})}
      />
    );
  }

  if (slide.kind === "ready") {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
        {Icon ? (
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-full",
              slide.iconBgClass
            )}
          >
            <Icon className="size-8" aria-hidden />
          </div>
        ) : null}
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {slide.headline}
        </h2>
        {slide.subline ? (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            {slide.subline}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
      {Icon ? (
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-full",
            slide.iconBgClass
          )}
        >
          <Icon className="size-8" aria-hidden />
        </div>
      ) : null}
      <h2 className="mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {slide.headline}
      </h2>
      {slide.body ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {slide.body}
        </p>
      ) : null}
    </div>
  );
}
