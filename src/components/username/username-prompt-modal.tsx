"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { setUsername } from "@/app/(dashboard)/settings/actions";
import { UsernameField } from "@/components/username/username-field";
import { Button } from "@/components/ui/button";

type UsernamePromptModalProps = {
  onComplete: () => void;
};

export function UsernamePromptModal({ onComplete }: UsernamePromptModalProps) {
  const [username, setUsernameValue] = useState("");
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!available || !username.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await setUsername(username);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onComplete();
    });
  };

  return (
    /* Fixed overlay — no close affordance; username is required */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="username-prompt-heading"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-wisk-purple to-wisk-teal">
            <Sparkles className="size-6 text-white" aria-hidden />
          </div>
          <div>
            <h2 id="username-prompt-heading" className="text-lg font-semibold text-foreground">
              Choose your username
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              WISK is adding collaboration features. Choose a username so others
              can find and tag you. You&apos;ll appear as{" "}
              <span className="font-medium text-foreground">
                {username ? `@${username}` : "@username"}
              </span>{" "}
              when collaborating.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <UsernameField
            id="prompt-username"
            value={username}
            onChange={setUsernameValue}
            onAvailabilityChange={setAvailable}
            disabled={isPending}
          />

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={!available || !username.trim() || isPending}
            className="w-full bg-gradient-to-r from-wisk-purple to-wisk-teal text-white hover:opacity-90"
          >
            {isPending ? "Saving…" : "Set username"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your display name stays the same — username is only used for
            collaboration.
          </p>
        </form>
      </div>
    </div>
  );
}
