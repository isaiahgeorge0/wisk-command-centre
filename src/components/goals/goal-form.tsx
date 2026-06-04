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
import { GOAL_CATEGORY_SUGGESTIONS } from "@/lib/goals/constants";
import { GOAL_STATUS_LABELS } from "@/lib/goals/constants";
import type { GoalFormInput, GoalStatus } from "@/lib/goals/types";
import { GOAL_STATUSES } from "@/lib/goals/types";

type GoalFormProps = {
  formId: string;
  values: GoalFormInput;
  onChange: (values: GoalFormInput) => void;
  disabled?: boolean;
  showCurrent?: boolean;
  compact?: boolean;
};

export function GoalForm({
  formId,
  values,
  onChange,
  disabled,
  showCurrent = true,
  compact,
}: GoalFormProps) {
  const setField = <K extends keyof GoalFormInput>(
    key: K,
    value: GoalFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
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

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-category`}>Category</Label>
        <Input
          id={`${formId}-category`}
          list={`${formId}-categories`}
          value={values.category ?? ""}
          onChange={(e) => setField("category", e.target.value)}
          disabled={disabled}
        />
        <datalist id={`${formId}-categories`}>
          {GOAL_CATEGORY_SUGGESTIONS.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </div>

      <div
        className={
          compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"
        }
      >
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-target`}>Target *</Label>
          <Input
            id={`${formId}-target`}
            type="number"
            min="0"
            step="any"
            value={values.target}
            onChange={(e) => setField("target", e.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-unit`}>Unit *</Label>
          <Input
            id={`${formId}-unit`}
            placeholder="e.g. £, projects, videos"
            value={values.unit}
            onChange={(e) => setField("unit", e.target.value)}
            disabled={disabled}
            required
          />
        </div>
      </div>

      {showCurrent ? (
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-current`}>Current progress</Label>
          <Input
            id={`${formId}-current`}
            type="number"
            min="0"
            step="any"
            value={values.current ?? "0"}
            onChange={(e) => setField("current", e.target.value)}
            disabled={disabled}
          />
        </div>
      ) : null}

      <div
        className={
          compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"
        }
      >
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
          <Label htmlFor={`${formId}-status`}>Status</Label>
          <Select
            value={values.status ?? "active"}
            onValueChange={(value) =>
              setField("status", (value ?? "active") as GoalStatus)
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${formId}-status`} className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {GOAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {GOAL_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
