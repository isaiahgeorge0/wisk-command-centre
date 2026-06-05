"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  disconnectIntegration,
  listVercelProjectsForImport,
} from "@/app/(dashboard)/settings/integrations/actions";
import { GitHubConnectForm } from "@/components/settings/github-connect-form";
import { IntegrationCard } from "@/components/settings/integration-card";
import { VercelConnectForm } from "@/components/settings/vercel-connect-form";
import { VercelImportDialog } from "@/components/settings/vercel-import-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SafeIntegration, VercelProjectSummary } from "@/lib/integrations/types";

type SettingsIntegrationsSectionProps = {
  integrations: SafeIntegration[];
};

export function SettingsIntegrationsSection({
  integrations,
}: SettingsIntegrationsSectionProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importProjects, setImportProjects] = useState<VercelProjectSummary[]>(
    []
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const vercelIntegration = integrations.find((i) => i.provider === "vercel");
  const githubIntegration = integrations.find((i) => i.provider === "github");

  const vercelConnected = Boolean(vercelIntegration);
  const githubConnected = Boolean(githubIntegration);

  const handleDisconnect = (provider: "vercel" | "github") => {
    setError(null);
    startTransition(async () => {
      const result = await disconnectIntegration(provider);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const openImportModal = (projects: VercelProjectSummary[]) => {
    setImportProjects(projects);
    setImportOpen(true);
  };

  const handleRefreshImportList = () => {
    setError(null);
    startTransition(async () => {
      const result = await listVercelProjectsForImport();
      if (!result.success) {
        setError(result.error);
        return;
      }
      openImportModal(result.data?.projects ?? []);
    });
  };

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect external services to enrich projects with deployment health
          and repository activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {successMessage ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            {successMessage}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <IntegrationCard provider="vercel" integration={vercelIntegration}>
          {vercelConnected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={handleRefreshImportList}
              >
                Import projects
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={isPending}
                onClick={() => handleDisconnect("vercel")}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <VercelConnectForm onConnected={openImportModal} />
          )}
        </IntegrationCard>

        <IntegrationCard provider="github" integration={githubIntegration}>
          <div className="space-y-3">
            <GitHubConnectForm integration={githubIntegration} />
            {githubConnected ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={isPending}
                onClick={() => handleDisconnect("github")}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </IntegrationCard>

        <VercelImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          projects={importProjects}
          onImported={(message) => {
            setSuccessMessage(message);
            setError(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
