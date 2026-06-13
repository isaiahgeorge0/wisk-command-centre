"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardError({
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
      <AlertTriangle
        className="mb-4 size-10 text-wisk-coral"
        aria-hidden
      />
      <h2 className="text-lg font-medium text-foreground">
        Something went wrong loading this page
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. You can try again, or head back to your
        overview.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to Overview
        </Link>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <details className="mt-8 max-w-lg text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Error details (development only)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
