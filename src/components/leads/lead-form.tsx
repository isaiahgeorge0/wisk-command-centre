"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/leads/constants";
import { LEAD_SOURCES, type LeadSource } from "@/lib/leads/types";
import type { LeadFormInput, LeadStatus } from "@/lib/leads/types";

type LeadFormProps = {
  formId: string;
  values: LeadFormInput;
  onChange: (values: LeadFormInput) => void;
  disabled?: boolean;
};

export function LeadForm({
  formId,
  values,
  onChange,
  disabled,
}: LeadFormProps) {
  const setField = <K extends keyof LeadFormInput>(
    key: K,
    value: LeadFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-name`}>Name *</Label>
        <Input
          id={`${formId}-name`}
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-source`}>Source *</Label>
          <ResponsiveSelect
            id={`${formId}-source`}
            value={values.source}
            onValueChange={(value) =>
              value && setField("source", value as LeadSource)
            }
            disabled={disabled}
            options={LEAD_SOURCES.map((source) => ({
              value: source,
              label: source,
            }))}
          >
            <Select
              value={values.source}
              onValueChange={(value) =>
              value && setField("source", value as LeadSource)
            }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-source`} className="w-full">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-status`}>Status *</Label>
          <ResponsiveSelect
            id={`${formId}-status`}
            value={values.status}
            onValueChange={(value) =>
              setField("status", value as LeadStatus)
            }
            disabled={disabled}
            options={PIPELINE_STATUSES.map((status) => ({
              value: status,
              label: LEAD_STATUS_LABELS[status],
            }))}
          >
            <Select
              value={values.status}
              onValueChange={(value) =>
                setField("status", value as LeadStatus)
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-status`} className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-service_interest`}>Service interest *</Label>
        <Input
          id={`${formId}-service_interest`}
          value={values.service_interest}
          onChange={(e) => setField("service_interest", e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            type="email"
            value={values.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-phone`}>Phone</Label>
          <Input
            id={`${formId}-phone`}
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-value`}>Estimated value (GBP)</Label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            id={`${formId}-value`}
            type="number"
            min="0"
            step="1"
            value={values.value ?? ""}
            onChange={(e) => setField("value", e.target.value)}
            disabled={disabled}
          />
          <div className="flex overflow-hidden rounded-md border border-input">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setField("value_type", "one_time")}
              className={`px-3 text-xs font-medium transition-colors ${
                (values.value_type ?? "one_time") === "one_time"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upfront
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setField("value_type", "monthly")}
              className={`border-l border-input px-3 text-xs font-medium transition-colors ${
                values.value_type === "monthly"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>
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
