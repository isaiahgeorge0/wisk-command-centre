"use client";

import { motion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";

type MessageToastProps = {
  senderName: string;
  preview: string;
  onDismiss: () => void;
  onClick: () => void;
};

export function MessageToast({
  senderName,
  preview,
  onDismiss,
  onClick,
}: MessageToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 right-6 z-50 flex w-80 items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xl"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
        <MessageSquare className="size-4 text-amber-500" />
      </div>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-sm font-medium text-foreground">{senderName}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{preview}</p>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
