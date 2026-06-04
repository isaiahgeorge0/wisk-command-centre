"use client";

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
import {
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_SUGGESTIONS,
} from "@/lib/projects/constants";
import type { ProjectFormInput, ProjectStatus } from "@/lib/projects/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";

type ProjectFormProps = {
  formId: string;
  values: ProjectFormInput;
  onChange: (values: ProjectFormInput) => void;
  disabled?: boolean;
};

export function ProjectForm({
  formId,
  values,
  onChange,
  disabled,
}: ProjectFormProps) {
  const setField = <K extends keyof ProjectFormInput>(
    key: K,
    value: ProjectFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-client_name`}>Client name *</Label>
        <Input
          id={`${formId}-client_name`}
          value={values.client_name}
          onChange={(e) => setField("client_name", e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-service_type`}>Service type *</Label>
        <Input
          id={`${formId}-service_type`}
          list={`${formId}-service-types`}
          value={values.service_type}
          onChange={(e) => setField("service_type", e.target.value)}
          disabled={disabled}
          required
        />
        <datalist id={`${formId}-service-types`}>
          {SERVICE_TYPE_SUGGESTIONS.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-status`}>Status *</Label>
        <Select
          value={values.status}
          onValueChange={(value) =>
            setField("status", value as ProjectStatus)
          }
          disabled={disabled}
        >
          <SelectTrigger id={`${formId}-status`} className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-next_action`}>Next action</Label>
        <Input
          id={`${formId}-next_action`}
          value={values.next_action ?? ""}
          onChange={(e) => setField("next_action", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
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
