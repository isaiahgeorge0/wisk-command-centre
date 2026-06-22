"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { disconnectOutlook } from "@/app/(dashboard)/settings/integrations/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SafeIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type OutlookIntegrationCardProps = {
  integration: SafeIntegration | undefined;
  hasAiPro: boolean;
};

export function OutlookIntegrationCard({
  integration,
  hasAiPro,
}: OutlookIntegrationCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connected = Boolean(integration);
  const email = integration?.metadata?.email as string | undefined;

  const handleDisconnect = () => {
    setError(null);
    startTransition(async () => {
      const result = await disconnectOutlook();
      setConfirmOpen(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Mail className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">Outlook</h3>
            {connected ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                Connected
              </span>
            ) : !hasAiPro ? (
              <Badge variant="secondary">AI Pro required</Badge>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {connected
              ? "Winston can read your Outlook inbox. Email integration features are active."
              : "Connect your Outlook account to let Winston read and organise your inbox."}
          </p>
          {connected && email ? (
            <p className="mt-2 text-xs text-muted-foreground">{email}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {connected ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Disconnect
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Outlook?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Winston will no longer be able to read your Outlook inbox.
                    You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      handleDisconnect();
                    }}
                  >
                    {isPending ? "Disconnecting…" : "Disconnect"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {hasAiPro ? (
              <Link
                href="/api/microsoft/connect"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Connect Outlook
              </Link>
            ) : (
              <Button size="sm" disabled>
                Connect Outlook
              </Button>
            )}
            {!hasAiPro ? (
              <Link
                href="/upgrade/ai-pro"
                className={cn(
                  "text-sm font-medium text-primary underline-offset-4 hover:underline"
                )}
              >
                Upgrade to AI Pro
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
