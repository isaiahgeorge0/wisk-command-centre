"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateFieldVisibility } from "@/app/(dashboard)/settings/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldVisibility } from "@/lib/preferences/types";

type ToggleDef = {
  key: string;
  label: string;
  section: keyof FieldVisibility;
  field: string;
};

const TOGGLES: ToggleDef[] = [
  { section: "projects", field: "serviceType", key: "projects-serviceType", label: "Show service type" },
  { section: "projects", field: "deadline", key: "projects-deadline", label: "Show deadline" },
  { section: "projects", field: "value", key: "projects-value", label: "Show value" },
  { section: "projects", field: "nextAction", key: "projects-nextAction", label: "Show next action" },
  { section: "projects", field: "siteUrl", key: "projects-siteUrl", label: "Show site URL" },
  { section: "projects", field: "notes", key: "projects-notes", label: "Show notes" },
  { section: "tasks", field: "priorityBadge", key: "tasks-priorityBadge", label: "Show priority badge" },
  { section: "tasks", field: "projectTag", key: "tasks-projectTag", label: "Show project tag" },
  { section: "tasks", field: "dueDate", key: "tasks-dueDate", label: "Show due date" },
  { section: "goals", field: "categoryTag", key: "goals-categoryTag", label: "Show category tag" },
  { section: "goals", field: "deadline", key: "goals-deadline", label: "Show deadline" },
  { section: "goals", field: "quickControls", key: "goals-quickControls", label: "Show quick +/- controls" },
  { section: "ideas", field: "categoryTag", key: "ideas-categoryTag", label: "Show category tag" },
  { section: "ideas", field: "statusBadge", key: "ideas-statusBadge", label: "Show status badge" },
];

const GROUPS: { title: string; section: keyof FieldVisibility }[] = [
  { title: "Projects", section: "projects" },
  { title: "Tasks", section: "tasks" },
  { title: "Goals", section: "goals" },
  { title: "Ideas", section: "ideas" },
];

type SettingsPreferencesSectionProps = {
  fieldVisibility: FieldVisibility;
};

export function SettingsPreferencesSection({
  fieldVisibility,
}: SettingsPreferencesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (
    section: keyof FieldVisibility,
    field: string,
    checked: boolean
  ) => {
    startTransition(async () => {
      const sectionState = fieldVisibility[section] as Record<string, boolean>;
      await updateFieldVisibility({
        [section]: { ...sectionState, [field]: checked },
      });
      router.refresh();
    });
  };

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Choose which optional fields appear on list and card views across the
          app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {GROUPS.map((group) => {
          const groupToggles = TOGGLES.filter((t) => t.section === group.section);
          return (
            <div key={group.section}>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {groupToggles.map((toggle) => {
                  const sectionState = fieldVisibility[
                    toggle.section
                  ] as Record<string, boolean>;
                  const checked = sectionState[toggle.field] ?? true;
                  return (
                    <li
                      key={toggle.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <Label htmlFor={toggle.key} className="font-normal">
                        {toggle.label}
                      </Label>
                      <Switch
                        id={toggle.key}
                        checked={checked}
                        disabled={isPending}
                        onCheckedChange={(value) =>
                          handleToggle(toggle.section, toggle.field, value)
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
