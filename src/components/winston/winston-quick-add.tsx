"use client";

import {
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FolderKanban,
  Lightbulb,
  Loader2,
  NotebookPen,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { createCalendarEvent } from "@/app/(dashboard)/calendar/actions";
import { createContentPost } from "@/app/(dashboard)/content/actions";
import { createGoal } from "@/app/(dashboard)/goals/actions";
import { createIdea } from "@/app/(dashboard)/ideas/actions";
import { createLead } from "@/app/(dashboard)/leads/actions";
import { createNote } from "@/app/(dashboard)/notes/actions";
import { createProject } from "@/app/(dashboard)/projects/actions";
import { createTask } from "@/app/(dashboard)/tasks/actions";
import { usePreferences } from "@/components/preferences/preferences-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_STANDALONE_CALENDAR_EVENT_FORM } from "@/lib/calendar/standalone-form";
import {
  CONTENT_PLATFORMS,
  type ContentPlatform,
} from "@/lib/content/types";
import { EMPTY_CONTENT_FORM } from "@/lib/content/form";
import { EMPTY_GOAL_FORM } from "@/lib/goals/form";
import { EMPTY_IDEA_FORM } from "@/lib/ideas/form";
import { EMPTY_LEAD_FORM } from "@/lib/leads/form";
import { toDateISO } from "@/lib/overview/date";
import { EMPTY_PROJECT_FORM } from "@/lib/projects/form";
import { EMPTY_TASK_FORM } from "@/lib/tasks/form";
import { cn } from "@/lib/utils";

type QuickAddKind =
  | "task"
  | "calendar"
  | "note"
  | "lead"
  | "project"
  | "idea"
  | "goal"
  | "content";

/**
 * Solid fill + on-accent text. `-fg` tokens are getReadableTextColor() of
 * `--wisk-section-*` (see globals.css) — luminance, not light/dark branching.
 */
const KIND_SURFACE: Record<QuickAddKind, string> = {
  task: "bg-wisk-section-tasks text-wisk-section-tasks-fg",
  calendar: "bg-wisk-section-calendar text-wisk-section-calendar-fg",
  note: "bg-wisk-section-notes text-wisk-section-notes-fg",
  lead: "bg-wisk-section-leads text-wisk-section-leads-fg",
  project: "bg-wisk-section-projects text-wisk-section-projects-fg",
  idea: "bg-wisk-section-ideas text-wisk-section-ideas-fg",
  goal: "bg-wisk-section-goals text-wisk-section-goals-fg",
  content: "bg-wisk-section-content text-wisk-section-content-fg",
};

const KINDS: {
  id: QuickAddKind;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "task", label: "Task", icon: CheckSquare },
  { id: "calendar", label: "Calendar event", icon: CalendarDays },
  { id: "note", label: "Note", icon: NotebookPen },
  { id: "lead", label: "Lead", icon: TrendingUp },
  { id: "project", label: "Project", icon: FolderKanban },
  { id: "idea", label: "Idea", icon: Lightbulb },
  { id: "goal", label: "Goal", icon: Target },
  { id: "content", label: "Content post", icon: Clapperboard },
];

const KIND_TITLES: Record<QuickAddKind, string> = {
  task: "Add task",
  calendar: "Add calendar event",
  note: "Add note",
  lead: "Add lead",
  project: "Add project",
  idea: "Add idea",
  goal: "Add goal",
  content: "Add content",
};

const selectClassName =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-8 md:text-sm";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function WinstonQuickAdd({
  onAskWinston,
  onCreated,
}: {
  onAskWinston: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<QuickAddKind | null>(null);

  if (!kind) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Add something in a few fields — no chat required.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-opacity hover:opacity-90",
                KIND_SURFACE[item.id]
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAskWinston}
          className="mt-4 text-center text-xs font-medium text-wisk-section-winston hover:underline"
        >
          or tell Winston what you need
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
      <button
        type="button"
        onClick={() => setKind(null)}
        className="mb-3 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        ← All types
      </button>
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {KIND_TITLES[kind]}
      </h3>
      <QuickAddForm kind={kind} onCreated={onCreated} />
    </div>
  );
}

function QuickAddForm({
  kind,
  onCreated,
}: {
  kind: QuickAddKind;
  onCreated: () => void;
}) {
  switch (kind) {
    case "task":
      return <TaskQuickAdd onCreated={onCreated} />;
    case "calendar":
      return <CalendarQuickAdd onCreated={onCreated} />;
    case "note":
      return <NoteQuickAdd onCreated={onCreated} />;
    case "lead":
      return <LeadQuickAdd onCreated={onCreated} />;
    case "project":
      return <ProjectQuickAdd onCreated={onCreated} />;
    case "idea":
      return <IdeaQuickAdd onCreated={onCreated} />;
    case "goal":
      return <GoalQuickAdd onCreated={onCreated} />;
    case "content":
      return <ContentQuickAdd onCreated={onCreated} />;
  }
}

function FormShell({
  onSubmit,
  error,
  isPending,
  submitLabel,
  children,
}: {
  onSubmit: (event: FormEvent) => void;
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-auto gap-2" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

function TaskQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add task"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createTask({
            ...EMPTY_TASK_FORM,
            title,
            due_date: dueDate,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title *" htmlFor="qa-task-title">
        <Input
          id="qa-task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Due date" htmlFor="qa-task-due">
        <Input
          id="qa-task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function CalendarQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toDateISO());
  const [eventType, setEventType] = useState<"lifestyle" | "other">(
    "lifestyle"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add event"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createCalendarEvent({
            ...EMPTY_STANDALONE_CALENDAR_EVENT_FORM,
            title,
            date,
            event_type: eventType,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title *" htmlFor="qa-cal-title">
        <Input
          id="qa-cal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Date *" htmlFor="qa-cal-date">
        <Input
          id="qa-cal-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Type *" htmlFor="qa-cal-type">
        <select
          id="qa-cal-type"
          className={selectClassName}
          value={eventType}
          onChange={(e) =>
            setEventType(e.target.value as "lifestyle" | "other")
          }
          disabled={isPending}
          required
        >
          <option value="lifestyle">Lifestyle / personal</option>
          <option value="other">Other</option>
        </select>
      </Field>
    </FormShell>
  );
}

function NoteQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add note"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createNote({ title, body });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title" htmlFor="qa-note-title">
        <Input
          id="qa-note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          disabled={isPending}
        />
      </Field>
      <Field label="Body" htmlFor="qa-note-body">
        <Textarea
          id="qa-note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function LeadQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add lead"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createLead({
            ...EMPTY_LEAD_FORM,
            name,
            service_interest: serviceInterest,
            value,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Name *" htmlFor="qa-lead-name">
        <Input
          id="qa-lead-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Service interest *" htmlFor="qa-lead-interest">
        <Input
          id="qa-lead-interest"
          value={serviceInterest}
          onChange={(e) => setServiceInterest(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Value" htmlFor="qa-lead-value">
        <Input
          id="qa-lead-value"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Optional"
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function ProjectQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const { serviceTypes } = usePreferences();
  const [projectName, setProjectName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add project"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createProject({
            ...EMPTY_PROJECT_FORM,
            project_name: projectName,
            service_type: serviceType,
            client_name: clientName,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Project name *" htmlFor="qa-project-name">
        <Input
          id="qa-project-name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Project type *" htmlFor="qa-project-type">
        <Input
          id="qa-project-type"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          list="qa-project-type-options"
          required
          disabled={isPending}
        />
        {serviceTypes.length > 0 ? (
          <datalist id="qa-project-type-options">
            {serviceTypes.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        ) : null}
      </Field>
      <Field label="Client" htmlFor="qa-project-client">
        <Input
          id="qa-project-client"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function IdeaQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add idea"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createIdea({
            ...EMPTY_IDEA_FORM,
            title,
            description,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title *" htmlFor="qa-idea-title">
        <Input
          id="qa-idea-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Description" htmlFor="qa-idea-desc">
        <Textarea
          id="qa-idea-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function GoalQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add goal"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createGoal({
            ...EMPTY_GOAL_FORM,
            title,
            target,
            unit,
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title *" htmlFor="qa-goal-title">
        <Input
          id="qa-goal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Target *" htmlFor="qa-goal-target">
        <Input
          id="qa-goal-target"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Unit *" htmlFor="qa-goal-unit">
        <Input
          id="qa-goal-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="e.g. clients, £, posts"
          required
          disabled={isPending}
        />
      </Field>
    </FormShell>
  );
}

function ContentQuickAdd({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>(
    EMPTY_CONTENT_FORM.platforms[0] ?? "TikTok"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <FormShell
      error={error}
      isPending={isPending}
      submitLabel="Add content"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createContentPost({
            ...EMPTY_CONTENT_FORM,
            title,
            platforms: [platform],
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
          onCreated();
        });
      }}
    >
      <Field label="Title *" htmlFor="qa-content-title">
        <Input
          id="qa-content-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isPending}
        />
      </Field>
      <Field label="Platform *" htmlFor="qa-content-platform">
        <select
          id="qa-content-platform"
          className={cn(selectClassName)}
          value={platform}
          onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
          required
          disabled={isPending}
        >
          {CONTENT_PLATFORMS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>
    </FormShell>
  );
}
