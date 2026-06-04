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
  IDEA_CATEGORY_SUGGESTIONS,
  IDEA_STATUS_LABELS,
} from "@/lib/ideas/constants";
import type { IdeaFormInput, IdeaStatus } from "@/lib/ideas/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";

type IdeaFormProps = {
  formId: string;
  values: IdeaFormInput;
  onChange: (values: IdeaFormInput) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function IdeaForm({
  formId,
  values,
  onChange,
  disabled,
  compact,
}: IdeaFormProps) {
  const setField = <K extends keyof IdeaFormInput>(
    key: K,
    value: IdeaFormInput[K]
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
        <Label htmlFor={`${formId}-description`}>Description</Label>
        <Textarea
          id={`${formId}-description`}
          value={values.description ?? ""}
          onChange={(e) => setField("description", e.target.value)}
          disabled={disabled}
          rows={compact ? 3 : 4}
        />
      </div>

      <div
        className={
          compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"
        }
      >
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
            {IDEA_CATEGORY_SUGGESTIONS.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-status`}>Status</Label>
          <Select
            value={values.status ?? "new"}
            onValueChange={(value) =>
              setField("status", (value ?? "new") as IdeaStatus)
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${formId}-status`} className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {IDEA_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {IDEA_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
