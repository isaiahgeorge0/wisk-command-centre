"use client";

import { useTransition } from "react";

import { resetOnboarding } from "@/app/(dashboard)/onboarding/actions";
import { useOnboarding } from "@/components/onboarding/onboarding-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FEATURE_REFERENCE_SECTIONS } from "@/lib/onboarding/slides";
import { cn } from "@/lib/utils";

export function SettingsHelpSection() {
  const { restart } = useOnboarding();
  const [isPending, startTransition] = useTransition();

  const handleRestart = () => {
    startTransition(async () => {
      const result = await resetOnboarding();
      if (result.success) {
        restart();
      }
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Help & guidance
        </h2>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">App walkthrough</CardTitle>
            <CardDescription>
              Replay the guided tour of all WISK features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={handleRestart}
              disabled={isPending}
            >
              {isPending ? "Starting…" : "Start walkthrough"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Feature reference
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURE_REFERENCE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="border-border/60 bg-card/80"
              >
                <CardContent className="flex gap-3 pt-6">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      section.iconBgClass
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{section.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
