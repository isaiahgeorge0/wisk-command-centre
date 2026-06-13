"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type SentryUserProps = {
  userId: string;
};

/** Sets Sentry user context on the client — ID only, no PII. */
export function SentryUser({ userId }: SentryUserProps) {
  useEffect(() => {
    Sentry.setUser({ id: userId });
    return () => {
      Sentry.setUser(null);
    };
  }, [userId]);

  return null;
}
