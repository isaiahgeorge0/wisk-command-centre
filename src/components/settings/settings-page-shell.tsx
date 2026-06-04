"use client";

import { PageTransition } from "@/components/layout/page-transition";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { PAGE_TITLE_CLASS, PAGE_SUBTITLE_CLASS } from "@/lib/navigation";
import type { FieldVisibility } from "@/lib/preferences/types";

type SettingsPageShellProps = {
  email: string;
  displayName: string;
  fieldVisibility: FieldVisibility;
  serviceTypes: string[];
};

export function SettingsPageShell(props: SettingsPageShellProps) {
  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className={PAGE_TITLE_CLASS}>Settings</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Profile, display preferences, and project service types.
        </p>
      </div>
      <SettingsPageClient {...props} />
    </PageTransition>
  );
}
