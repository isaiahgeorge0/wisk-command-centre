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

  useEffect(() => {
    setActiveTab(tabFromSearchParam(searchParams.get("tab")));
  }, [searchParams]);

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
            <SettingsWinstonSection usage={winstonUsage} />
          ) : null}
        </div>
      ) : null}

      {activeTab === "service-types" ? (
        <SettingsServiceTypesSection serviceTypes={serviceTypes} />
      ) : null}

      {activeTab === "integrations" ? (
        <SettingsIntegrationsSection integrations={integrations} />
      ) : null}

      {activeTab === "help" ? <SettingsHelpSection /> : null}

      <SettingsFeedbackSection />
    </div>
  );
}
