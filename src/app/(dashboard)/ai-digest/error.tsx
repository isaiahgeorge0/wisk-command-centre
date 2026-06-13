"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function WinstonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-card/40 px-6 py-16 text-center">
      <Sparkles
        className="mb-4 size-10 text-muted-foreground"
        aria-hidden
      />
      <h2 className="text-lg font-medium text-foreground">
        Winston is having trouble right now
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This might be temporary. Try again in a moment.
      </p>

      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
