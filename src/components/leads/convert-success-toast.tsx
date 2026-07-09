"use client";

import Link from "next/link";
import { useEffect } from "react";

type ConvertSuccessToastProps = {
  open: boolean;
  onDismiss: () => void;
};

export function ConvertSuccessToast({
  open,
  onDismiss,
}: ConvertSuccessToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
    >
      <p className="text-sm text-foreground">
        Project created.{" "}
        <Link
          href="/projects"
          className="font-medium text-wisk-section-leads hover:underline"
          onClick={onDismiss}
        >
          View it in Projects →
        </Link>
      </p>
    </div>
  );
}
