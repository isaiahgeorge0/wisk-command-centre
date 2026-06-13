"use client";

import { useState, useTransition } from "react";

import { submitAccessRequest } from "@/app/sign-in/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AccessRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToSignIn?: (email: string) => void;
};

export function AccessRequestDialog({
  open,
  onOpenChange,
  onGoToSignIn,
}: AccessRequestDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setEmail("");
      setError(null);
      setAlreadyRegistered(false);
      setConfirmed(false);
    }
    onOpenChange(next);
  };

  const handleGoToSignIn = () => {
    const submittedEmail = email.trim();
    handleOpenChange(false);
    onGoToSignIn?.(submittedEmail);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);

    startTransition(async () => {
      const result = await submitAccessRequest({ name, email });
      if (!result.success) {
        setError(result.error);
        setAlreadyRegistered(result.alreadyRegistered === true);
        return;
      }
      setConfirmed(true);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {confirmed ? (
          <>
            <DialogHeader>
              <DialogTitle>Request received</DialogTitle>
              <DialogDescription>
                Thanks — we&apos;ll review your request and be in touch if access
                is approved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request access</DialogTitle>
              <DialogDescription>
                WISK is invite-only. Tell us who you are and we&apos;ll review
                your request.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="access-name">Name</Label>
                <Input
                  id="access-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="access-email">Email</Label>
                <Input
                  id="access-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              {error && alreadyRegistered ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-left">
                  <p className="text-sm text-foreground">{error}</p>
                  <button
                    type="button"
                    onClick={handleGoToSignIn}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-3"
                    )}
                  >
                    Go to sign in
                  </button>
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Submitting…" : "Submit request"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
