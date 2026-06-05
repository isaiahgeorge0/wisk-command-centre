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
import {
  CONTENT_STATUS_LABELS,
  PIPELINE_STATUSES,
} from "@/lib/content/constants";
import {
  CONTENT_PLATFORMS,
  CONTENT_TYPES,
  type ContentPlatform,
  type ContentStatus,
  type ContentType,
} from "@/lib/content/types";
import type { ContentFormInput } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";

type ContentFormProps = {
  formId: string;
  values: ContentFormInput;
  onChange: (values: ContentFormInput) => void;
  contentGoals: Pick<Goal, "id" | "title">[];
  disabled?: boolean;
};

export function ContentForm({
  formId,
  values,
  onChange,
  contentGoals,
  disabled,
}: ContentFormProps) {
  const setField = <K extends keyof ContentFormInput>(
    key: K,
    value: ContentFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-title`}>Title *</Label>
        <Input
          id={`${formId}-title`}
          value={values.title}
          onChange={(e) => setField("title", e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-platform`}>Platform *</Label>
          <ResponsiveSelect
            id={`${formId}-platform`}
            value={values.platform}
            onValueChange={(value) =>
              value && setField("platform", value as ContentPlatform)
            }
            disabled={disabled}
            options={CONTENT_PLATFORMS.map((platform) => ({
              value: platform,
              label: platform,
            }))}
          >
            <Select
              value={values.platform}
              onValueChange={(value) =>
                value && setField("platform", value as ContentPlatform)
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-platform`} className="w-full">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-content_type`}>Content type *</Label>
          <ResponsiveSelect
            id={`${formId}-content_type`}
            value={values.content_type}
            onValueChange={(value) =>
              value && setField("content_type", value as ContentType)
            }
            disabled={disabled}
            options={CONTENT_TYPES.map((type) => ({
              value: type,
              label: type,
            }))}
          >
            <Select
              value={values.content_type}
              onValueChange={(value) =>
                value && setField("content_type", value as ContentType)
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-content_type`} className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-status`}>Status *</Label>
        <ResponsiveSelect
          id={`${formId}-status`}
          value={values.status}
          onValueChange={(value) =>
            value && setField("status", value as ContentStatus)
          }
          disabled={disabled}
          options={PIPELINE_STATUSES.map((status) => ({
            value: status,
            label: CONTENT_STATUS_LABELS[status],
          }))}
        >
          <Select
            value={values.status}
            onValueChange={(value) =>
              value && setField("status", value as ContentStatus)
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${formId}-status`} className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CONTENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ResponsiveSelect>
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-scheduled_date`}>Scheduled date</Label>
          <Input
            id={`${formId}-scheduled_date`}
            type="date"
            value={values.scheduled_date ?? ""}
            onChange={(e) => setField("scheduled_date", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-published_date`}>Published date</Label>
          <Input
            id={`${formId}-published_date`}
            type="date"
            value={values.published_date ?? ""}
            onChange={(e) => setField("published_date", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-hook`}>Hook</Label>
        <Input
          id={`${formId}-hook`}
          value={values.hook ?? ""}
          onChange={(e) => setField("hook", e.target.value)}
          disabled={disabled}
          placeholder="Opening line or hook"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-description`}>Description</Label>
        <Textarea
          id={`${formId}-description`}
          value={values.description ?? ""}
          onChange={(e) => setField("description", e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-tags`}>Tags</Label>
        <Input
          id={`${formId}-tags`}
          value={values.tags ?? ""}
          onChange={(e) => setField("tags", e.target.value)}
          disabled={disabled}
          placeholder="Comma-separated tags"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-goal_id`}>Content goal</Label>
        <ResponsiveSelect
          id={`${formId}-goal_id`}
          value={values.goal_id || "none"}
          onValueChange={(value) =>
            setField("goal_id", value === "none" ? "" : value ?? "")
          }
          disabled={disabled}
          options={[
            { value: "none", label: "No goal linked" },
            ...contentGoals.map((goal) => ({
              value: goal.id,
              label: goal.title,
            })),
          ]}
        >
          <Select
            value={values.goal_id || "none"}
            onValueChange={(value) =>
              setField("goal_id", value === "none" ? "" : value ?? "")
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${formId}-goal_id`} className="w-full">
              <SelectValue placeholder="Link to a content goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No goal linked</SelectItem>
              {contentGoals.map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  {goal.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ResponsiveSelect>
      </div>
    </div>
  );
}
