"use client";

import { useEffect } from "react";

type PasswordUpdatedToastProps = {
  open: boolean;
  onDismiss: () => void;
};

export function PasswordUpdatedToast({
  open,
  onDismiss,
}: PasswordUpdatedToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
    >
      <p className="text-sm text-foreground">Password updated successfully.</p>
    </div>
  );
}
