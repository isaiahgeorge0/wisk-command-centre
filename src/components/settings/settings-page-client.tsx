"use client";

import { SettingsPreferencesSection } from "@/components/settings/settings-preferences-section";
import { SettingsProfileSection } from "@/components/settings/settings-profile-section";
import { SettingsServiceTypesSection } from "@/components/settings/settings-service-types-section";
import type { FieldVisibility } from "@/lib/preferences/types";

type SettingsPageClientProps = {
  email: string;
  displayName: string;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
};

export function SettingsPageClient({
  email,
  displayName,
  fieldVisibility,
  serviceTypes,
}: SettingsPageClientProps) {
  return (
    <div className="space-y-8">
      <SettingsProfileSection email={email} initialName={displayName} />
      <SettingsPreferencesSection fieldVisibility={fieldVisibility} />
      <SettingsServiceTypesSection serviceTypes={serviceTypes} />
    </div>
  );
}
