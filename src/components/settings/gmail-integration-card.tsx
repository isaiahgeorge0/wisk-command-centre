"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  disconnectGmail,
  updateIntegrationLabel,
} from "@/app/(dashboard)/settings/integrations/actions";
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
import { Input } from "@/components/ui/input";
import { IntegrationSignatureSection } from "@/components/settings/integration-signature-section";
import type { SafeIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

const MAX_ACCOUNTS = 3;

type GmailIntegrationCardProps = {
  integrations: SafeIntegration[];
  hasAiPro: boolean;
};

function getAccountEmail(integration: SafeIntegration): string {
  return (
    integration.email_address ??
    (typeof integration.metadata?.email === "string"
      ? integration.metadata.email
      : "")
  );
}

export function GmailIntegrationCard({
  integrations,
  hasAiPro,
}: GmailIntegrationCardProps) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [labels, setLabels] = useState<Record<string, string>>({});

  const connected = integrations.length > 0;
  const atMax = integrations.length >= MAX_ACCOUNTS;

  useEffect(() => {
    setLabels(
      Object.fromEntries(
        integrations.map((integration) => [
          integration.id,
          integration.label ?? "",
        ])
      )
    );
  }, [integrations]);

  const handleLabelBlur = (integrationId: string) => {
    const label = labels[integrationId] ?? "";
    const existing = integrations.find((i) => i.id === integrationId);
    const existingLabel = existing?.label ?? "";

    if (label === existingLabel) return;

    startTransition(async () => {
      const result = await updateIntegrationLabel(integrationId, label);
      if (!result.success) {
        setError(result.error);
        setLabels((current) => ({
          ...current,
          [integrationId]: existingLabel,
        }));
      }
    });
  };

  const handleDisconnect = (integrationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await disconnectGmail(integrationId);
      setConfirmId(null);

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
            <h3 className="font-medium text-foreground">Gmail</h3>
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
              ? "Winston can read your inbox. Email integration features are active."
              : "Connect your Gmail account to let Winston read and organise your inbox."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {connected ? (
          <div className="space-y-3">
            {integrations.map((integration) => {
              const email = getAccountEmail(integration);

              return (
                <div
                  key={integration.id}
                  className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{email}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground"
                      disabled={isPending}
                      onClick={() => setConfirmId(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                  <Input
                    value={labels[integration.id] ?? ""}
                    onChange={(event) =>
                      setLabels((current) => ({
                        ...current,
                        [integration.id]: event.target.value,
                      }))
                    }
                    onBlur={() => handleLabelBlur(integration.id)}
                    placeholder="Add a label (e.g. Work, Personal)"
                    className="h-9"
                  />
                  <IntegrationSignatureSection
                    integration={integration}
                    providerLabel="Gmail"
                  />
                </div>
              );
            })}

            {atMax ? (
              <p className="text-xs text-muted-foreground">
                Maximum accounts reached
              </p>
            ) : hasAiPro ? (
              <Link
                href="/api/google/connect"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Add another Gmail account
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {hasAiPro ? (
              <Link
                href="/api/google/connect"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Add Gmail account
              </Link>
            ) : (
              <Button size="sm" disabled>
                Add Gmail account
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

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail account?</AlertDialogTitle>
            <AlertDialogDescription>
              Winston will no longer be able to read this inbox. You can
              reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                if (confirmId) handleDisconnect(confirmId);
              }}
            >
              {isPending ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
