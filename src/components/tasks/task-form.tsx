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
import { NO_PROJECT_VALUE } from "@/lib/tasks/form";
import {
  TASK_PRIORITY_LABELS,
} from "@/lib/tasks/constants";
import type { ProjectOption, TaskFormInput, TaskPriority } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";

type TaskFormProps = {
  formId: string;
  values: TaskFormInput;
  onChange: (values: TaskFormInput) => void;
  projects: ProjectOption[];
  disabled?: boolean;
  compact?: boolean;
};

export function TaskForm({
  formId,
  values,
  onChange,
  projects,
  disabled,
  compact,
}: TaskFormProps) {
  const setField = <K extends keyof TaskFormInput>(
    key: K,
    value: TaskFormInput[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  const projectValue = values.project_id ?? NO_PROJECT_VALUE;

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

      <div className={compact ? "grid gap-3 md:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-priority`}>Priority *</Label>
          <ResponsiveSelect
            id={`${formId}-priority`}
            value={values.priority}
            onValueChange={(value) =>
              setField("priority", value as TaskPriority)
            }
            disabled={disabled}
            options={TASK_PRIORITIES.map((priority) => ({
              value: priority,
              label: TASK_PRIORITY_LABELS[priority],
            }))}
          >
            <Select
              value={values.priority}
              onValueChange={(value) =>
                setField("priority", value as TaskPriority)
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-priority`} className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {TASK_PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-project`}>Project</Label>
          <ResponsiveSelect
            id={`${formId}-project`}
            value={projectValue}
            onValueChange={(value) =>
              setField("project_id", value ?? NO_PROJECT_VALUE)
            }
            disabled={disabled}
            options={[
              { value: NO_PROJECT_VALUE, label: "No project" },
              ...projects.map((project) => ({
                value: project.id,
                label: project.project_name,
              })),
            ]}
          >
            <Select
              value={projectValue}
              onValueChange={(value) =>
                setField("project_id", value ?? NO_PROJECT_VALUE)
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${formId}-project`} className="w-full">
                <SelectValue placeholder="No project">
                  {(value) => {
                    if (value == null || value === NO_PROJECT_VALUE) {
                      return "No project";
                    }
                    const project = projects.find((p) => p.id === value);
                    return project?.project_name ?? String(value);
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ResponsiveSelect>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-due_date`}>Due date</Label>
        <Input
          id={`${formId}-due_date`}
          type="date"
          value={values.due_date ?? ""}
          onChange={(e) => setField("due_date", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
