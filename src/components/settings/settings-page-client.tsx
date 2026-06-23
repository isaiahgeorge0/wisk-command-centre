"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SettingsBillingSection } from "@/components/settings/settings-billing-section";
import { SettingsFeedbackSection } from "@/components/settings/settings-feedback-section";
import { SettingsHelpSection } from "@/components/settings/settings-help-section";
import { SettingsIntegrationsSection } from "@/components/settings/settings-integrations-section";
import { SettingsPreferencesSection } from "@/components/settings/settings-preferences-section";
import { SettingsProfileSection } from "@/components/settings/settings-profile-section";
import { SettingsServiceTypesSection } from "@/components/settings/settings-service-types-section";
import { SettingsToolsSection } from "@/components/settings/settings-tools-section";
import { SettingsWinstonSection } from "@/components/settings/settings-winston-section";
import {
  SettingsTabs,
  tabFromSearchParam,
  type SettingsTab,
} from "@/components/settings/settings-tabs";
import type { MonthlyUsage } from "@/lib/ai/types";
import type { BillingPlan } from "@/lib/billing/types";
import type { SafeIntegration } from "@/lib/integrations/types";
import type { FieldVisibility } from "@/lib/preferences/types";

type SettingsPageClientProps = {
  email: string;
  displayName: string;
  accountName: string;
  username?: string | null;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
  integrations: SafeIntegration[];
  aiAccess?: boolean;
  emailPicksEnabled?: boolean;
  winstonUsage?: MonthlyUsage | null;
  billingPlan?: BillingPlan;
  billingPlanLabel?: string;
  billingPeriodEnd?: string | null;
};

export function SettingsPageClient({
  email,
  displayName,
  accountName,
  username = null,
  fieldVisibility,
  serviceTypes,
  integrations,
  aiAccess = false,
  emailPicksEnabled = true,
  winstonUsage = null,
  billingPlan = "free",
  billingPlanLabel = "Free",
  billingPeriodEnd = null,
}: SettingsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    tabFromSearchParam(searchParams.get("tab"))
  );
  const [integrationToast, setIntegrationToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setActiveTab(tabFromSearchParam(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const integrationError = searchParams.get("error");

    const integrationMessages = {
      gmail: {
        success: "Gmail connected successfully",
        error: "Could not connect Gmail. Please try again.",
      },
      outlook: {
        success: "Outlook connected successfully",
        error: "Could not connect Outlook. Please try again.",
      },
    } as const;

    const duplicateMessages = {
      "gmail-duplicate": "That Gmail account is already connected",
      "outlook-duplicate": "That Outlook account is already connected",
    } as const;

    if (
      integrationError === "gmail-duplicate" ||
      integrationError === "outlook-duplicate"
    ) {
      setActiveTab("integrations");
      setIntegrationToast({
        type: "error",
        message: duplicateMessages[integrationError],
      });

      const params = new URLSearchParams(searchParams.toString());
      params.delete("connected");
      params.delete("error");
      params.set("tab", "integrations");
      const query = params.toString();
      router.replace(query ? `/settings?${query}` : "/settings", {
        scroll: false,
      });
      return;
    }

    const provider =
      connected === "gmail" || connected === "outlook"
        ? connected
        : integrationError === "gmail" || integrationError === "outlook"
          ? integrationError
          : null;

    if (!provider) {
      return;
    }

    setActiveTab("integrations");
    setIntegrationToast(
      connected === provider
        ? {
            type: "success",
            message: integrationMessages[provider].success,
          }
        : {
            type: "error",
            message: integrationMessages[provider].error,
          }
    );

    const params = new URLSearchParams(searchParams.toString());
    params.delete("connected");
    params.delete("error");
    params.set("tab", "integrations");
    const query = params.toString();
    router.replace(query ? `/settings?${query}` : "/settings", {
      scroll: false,
    });
  }, [router, searchParams]);

  useEffect(() => {
    if (!integrationToast) return;
    const timer = window.setTimeout(() => setIntegrationToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [integrationToast]);

  const hasAiPro = billingPlan === "ai_pro" || billingPlan === "max";

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "profile") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `/settings?${query}` : "/settings", {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-8">
      {integrationToast ? (
        <div
          role="status"
          className={
            integrationToast.type === "success"
              ? "fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
              : "fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6"
          }
        >
          <p
            className={
              integrationToast.type === "success"
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-destructive"
            }
          >
            {integrationToast.message}
          </p>
        </div>
      ) : null}

      <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === "profile" ? (
        <>
          <SettingsProfileSection
            email={email}
            initialDisplayName={displayName}
            initialName={accountName}
            initialUsername={username ?? null}
          />
          <SettingsToolsSection />
        </>
      ) : null}

      {activeTab === "preferences" ? (
        <div className="space-y-8">
          <SettingsPreferencesSection fieldVisibility={fieldVisibility} />
          <SettingsBillingSection
            plan={billingPlan}
            planLabel={billingPlanLabel}
            currentPeriodEnd={billingPeriodEnd}
          />
          {aiAccess && winstonUsage ? (
            <SettingsWinstonSection
              usage={winstonUsage}
              emailPicksEnabled={emailPicksEnabled}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "service-types" ? (
        <SettingsServiceTypesSection serviceTypes={serviceTypes} />
      ) : null}

      {activeTab === "integrations" ? (
        <SettingsIntegrationsSection
          integrations={integrations}
          hasAiPro={hasAiPro}
        />
      ) : null}

      {activeTab === "help" ? <SettingsHelpSection /> : null}

      <SettingsFeedbackSection />
    </div>
  );
}
