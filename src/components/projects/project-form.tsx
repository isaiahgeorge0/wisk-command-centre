"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ExpandableSection } from "@/components/motion/expandable-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import type { ProjectFormInput, ProjectStatus } from "@/lib/projects/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

const PROJECT_TYPE_SUGGESTION_LIMIT = 5;

function getProjectTypeSuggestions(
  query: string,
  recentProjectTypes: string[],
  savedProjectTypes: string[]
): string[] {
  const seen = new Set<string>();
  const all: string[] = [];

  for (const type of [...recentProjectTypes, ...savedProjectTypes]) {
    const trimmed = type.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    all.push(trimmed);
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...all]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, PROJECT_TYPE_SUGGESTION_LIMIT);
  }

  function matchScore(type: string): number {
    const lower = type.toLowerCase();
    if (lower.startsWith(normalizedQuery)) return 0;
    if (lower.includes(normalizedQuery)) return 1;
    return 2;
  }

  return [...all]
    .sort((a, b) => {
      const scoreDiff = matchScore(a) - matchScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      return a.localeCompare(b);
    })
    .slice(0, PROJECT_TYPE_SUGGESTION_LIMIT);
}

function ProjectTypeField({
  formId,
  value,
  onChange,
  recentProjectTypes,
  projectTypeOptions,
  disabled,
}: {
  formId: string;
  value: string;
  onChange: (value: string) => void;
  recentProjectTypes: string[];
  projectTypeOptions: string[];
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const suggestions = useMemo(
    () =>
      getProjectTypeSuggestions(value, recentProjectTypes, projectTypeOptions),
    [value, recentProjectTypes, projectTypeOptions]
  );

  useLayoutEffect(() => {
    if (!open || !inputRef.current) {
      setDropdownRect(null);
      return;
    }

    const updateRect = () => {
      if (inputRef.current) {
        setDropdownRect(inputRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, value, suggestions.length]);

  const showDropdown = open && suggestions.length > 0;

  return (
    <>
      <Input
        ref={inputRef}
        id={`${formId}-service_type`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
        required
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? `${formId}-project-types-list` : undefined}
      />
      {showDropdown && dropdownRect
        ? createPortal(
            <ul
              id={`${formId}-project-types-list`}
              role="listbox"
              className="fixed z-[210] overflow-hidden rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
              style={{
                top: dropdownRect.bottom + 4,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
            >
              {suggestions.map((type) => (
                <li key={type} role="option" aria-selected={type === value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      type === value && "bg-accent/50"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(type);
                      setOpen(false);
                    }}
                  >
                    {type}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}

type ProjectFormProps = {
  formId: string;
  values: ProjectFormInput;
  onChange: (values: ProjectFormInput) => void;
  projectTypeOptions: string[];
  recentProjectTypes: string[];
  disabled?: boolean;
};

function shouldShowDevFields(
  projectType: string,
  siteUrl?: string,
  githubRepo?: string
): boolean {
  const hasStored =
    Boolean(siteUrl?.trim()) || Boolean(githubRepo?.trim());
  if (hasStored) {
    return true;
  }

  const normalized = projectType.toLowerCase();
  return (
    normalized.includes("web development") ||
    normalized.includes("app development")
  );
}

export function ProjectForm({
  formId,
  values,
  onChange,
  projectTypeOptions,
  recentProjectTypes,
  disabled,
}: ProjectFormProps) {
  const setField = <K extends keyof ProjectFormInput>(
    key: K,
    value: ProjectFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  const showDevFields = shouldShowDevFields(
    values.service_type,
    values.site_url,
    values.github_repo
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2" data-tour="project-name">
        <Label htmlFor={`${formId}-project_name`}>Project name *</Label>
        <Input
          id={`${formId}-project_name`}
          value={values.project_name}
          onChange={(e) => setField("project_name", e.target.value)}
          placeholder="e.g. Restaurant Website Redesign"
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-2" data-tour="client-name">
        <Label htmlFor={`${formId}-client_name`}>Client name</Label>
        <Input
          id={`${formId}-client_name`}
          value={values.client_name ?? ""}
          onChange={(e) => setField("client_name", e.target.value)}
          placeholder="e.g. The Food Plug"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          The person or business this project is for
        </p>
      </div>

      <div className="grid gap-2" data-tour="service-type">
        <Label htmlFor={`${formId}-service_type`}>Project type *</Label>
        <ProjectTypeField
          formId={formId}
          value={values.service_type}
          onChange={(nextValue) => setField("service_type", nextValue)}
          recentProjectTypes={recentProjectTypes}
          projectTypeOptions={projectTypeOptions}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2" data-tour="status">
        <Label htmlFor={`${formId}-status`}>Status *</Label>
        <Select
          value={values.status}
          onValueChange={(value) => setField("status", value as ProjectStatus)}
          disabled={disabled}
        >
          <SelectTrigger id={`${formId}-status`} className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="z-[210]">
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ExpandableSection open={showDevFields} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-site_url`}>Site URL</Label>
          <Input
            id={`${formId}-site_url`}
            type="url"
            placeholder="https://your-site.com"
            value={values.site_url ?? ""}
            onChange={(e) => setField("site_url", e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Used to monitor deployment health via your Vercel integration
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-github_repo`}>GitHub repo</Label>
          <Input
            id={`${formId}-github_repo`}
            placeholder="owner/repo or https://github.com/owner/repo"
            value={values.github_repo ?? ""}
            onChange={(e) => setField("github_repo", e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Format: username/repo-name or full GitHub URL
          </p>
        </div>
      </ExpandableSection>

      <div className="grid gap-2" data-tour="next-action">
        <Label htmlFor={`${formId}-next_action`}>Next action</Label>
        <Input
          id={`${formId}-next_action`}
          value={values.next_action ?? ""}
          onChange={(e) => setField("next_action", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4" data-tour="deadline-value">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-deadline`}>Deadline</Label>
          <Input
            id={`${formId}-deadline`}
            type="date"
            value={values.deadline ?? ""}
            onChange={(e) => setField("deadline", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-value`}>Value (GBP)</Label>
          <Input
            id={`${formId}-value`}
            type="number"
            min="0"
            step="1"
            value={values.value ?? ""}
            onChange={(e) => setField("value", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-notes`}>Notes</Label>
        <Textarea
          id={`${formId}-notes`}
          value={values.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}
