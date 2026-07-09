"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.55 0.14 300 / 0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.65 0.1 180 / 0.08), transparent 50%)",
            }}
          />

          <div className="relative z-10 flex max-w-md flex-col items-center text-center">
            <span className="bg-wisk-lime bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl">
              WISK
            </span>

            <h1 className="mt-10 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We&apos;ve hit an unexpected error. Try refreshing the page — if
              it keeps happening, let us know.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-8 rounded-lg bg-wisk-lime px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Refresh page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
