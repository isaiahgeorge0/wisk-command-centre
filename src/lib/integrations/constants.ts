import type { IntegrationProvider } from "@/lib/integrations/types";

export const INTEGRATION_PROVIDER_LABELS: Record<IntegrationProvider, string> =
  {
    vercel: "Vercel",
    github: "GitHub",
  };

export const INTEGRATION_PROVIDER_DESCRIPTIONS: Record<
  IntegrationProvider,
  string
> = {
  vercel:
    "Import Vercel projects and monitor production deployment health on your web projects.",
  github:
    "Link GitHub repositories to projects and see recent commits and open issues.",
};

export const VERCEL_IMPORT_SERVICE_TYPE = "Web Development";
