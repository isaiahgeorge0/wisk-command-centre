/**
 * Shared Winston propose → review → commit contract.
 * Feature routes generate a WinstonProposal; only the review UI + commit
 * orchestration live in the shared layer.
 */

export const WINSTON_PROPOSAL_ENTITY_TYPES = [
  "project",
  "task",
  "calendar_event",
  "content_post",
  "idea",
] as const;

export type WinstonProposalEntityType =
  (typeof WINSTON_PROPOSAL_ENTITY_TYPES)[number];

export const WINSTON_PROPOSAL_SOURCE_TYPES = [
  "note",
  "idea",
  "conversation",
] as const;

export type WinstonProposalSourceType =
  (typeof WINSTON_PROPOSAL_SOURCE_TYPES)[number];

export type WinstonProposalItem = {
  tempId: string;
  entityType: WinstonProposalEntityType;
  /** Entity-specific fields — see defaultProposalFields / commit mapping. */
  fields: Record<string, unknown>;
  /** Why Winston proposed this — never blank for model-generated items. */
  reasoning: string;
  /** Defaults true; deselect excludes from commit without removing. */
  selected: boolean;
};

export type WinstonProposal = {
  proposalId: string;
  sourceType: WinstonProposalSourceType;
  sourceId: string;
  items: WinstonProposalItem[];
};

export type WinstonProposalCreatedRef = {
  id: string;
  label: string;
  href: string;
  /** Proposal item tempId — drop succeeded items on partial commit. */
  tempId?: string;
};

export type WinstonProposalCommitResult = {
  created: {
    projects: WinstonProposalCreatedRef[];
    tasks: WinstonProposalCreatedRef[];
    calendar_events: WinstonProposalCreatedRef[];
    content_posts: WinstonProposalCreatedRef[];
    ideas: WinstonProposalCreatedRef[];
  };
  /** Soft failures for individual items; others may still have succeeded. */
  errors: string[];
};

export const WINSTON_PROPOSAL_ENTITY_LABELS: Record<
  WinstonProposalEntityType,
  string
> = {
  project: "Project",
  task: "Task",
  calendar_event: "Calendar event",
  content_post: "Content post",
  idea: "Idea",
};

export function createProposalTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Sensible empty fields for a manually added item of the given type. */
export function defaultProposalFields(
  entityType: WinstonProposalEntityType
): Record<string, unknown> {
  switch (entityType) {
    case "project":
      return {
        project_name: "",
        service_type: "Other",
        status: "active",
        deadline: "",
        client_name: "",
        notes: "",
      };
    case "task":
      return {
        title: "",
        priority: "medium",
        due_date: "",
        /** tempId of a project item in the same proposal */
        projectRef: "",
        /** Existing project UUID */
        projectId: "",
        raw_content: "",
      };
    case "calendar_event":
      return {
        title: "",
        date: "",
        end_date: "",
        event_type: "lifestyle",
        notes: "",
      };
    case "content_post":
      return {
        title: "",
        platforms: ["TikTok"],
        content_type: "Video",
        status: "idea",
        scheduled_date: "",
        description: "",
      };
    case "idea":
      return {
        title: "",
        description: "",
        category: "Calendar",
        status: "awaiting-date",
      };
  }
}

export function createManualProposalItem(
  entityType: WinstonProposalEntityType
): WinstonProposalItem {
  return {
    tempId: createProposalTempId(),
    entityType,
    fields: defaultProposalFields(entityType),
    reasoning: "Added by you",
    selected: true,
  };
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

const PROPOSAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProposalUuid(value: string): boolean {
  return PROPOSAL_UUID_RE.test(value);
}

type GeneratedProposalItemInput = {
  tempId?: string;
  entityType: WinstonProposalEntityType;
  fields: Record<string, unknown>;
  reasoning: string;
  selected?: boolean;
};

function nestedTaskList(fields: Record<string, unknown>): unknown[] {
  for (const key of ["tasks", "suggested_tasks", "suggestedTasks", "task_list"]) {
    const value = fields[key];
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

/**
 * Lift tasks the model nested under a project into sibling items with projectRef.
 */
export function expandNestedProposalTasks(
  items: WinstonProposalItem[]
): WinstonProposalItem[] {
  const extra: WinstonProposalItem[] = [];
  const next = items.map((item) => {
    if (item.entityType !== "project") return item;
    const nested = nestedTaskList(item.fields);
    if (nested.length === 0) return item;

    for (const raw of nested) {
      if (!raw || typeof raw !== "object") continue;
      const rec = raw as Record<string, unknown>;
      const title = asString(rec.title || rec.name).trim();
      if (!title) continue;
      extra.push({
        tempId: createProposalTempId(),
        entityType: "task",
        fields: {
          title,
          priority: asString(rec.priority, "medium"),
          due_date: asString(rec.due_date),
          projectRef: item.tempId,
          raw_content: asString(
            rec.raw_content || rec.description || rec.notes
          ),
        },
        reasoning:
          asString(rec.reasoning).trim() ||
          `Task for ${asString(item.fields.project_name) || "the new project"}`,
        selected: true,
      });
    }

    const fields = { ...item.fields };
    delete fields.tasks;
    delete fields.suggested_tasks;
    delete fields.suggestedTasks;
    delete fields.task_list;
    return { ...item, fields };
  });

  return extra.length > 0 ? [...next, ...extra] : next;
}

/**
 * Point tasks at new projects via projectRef (tempId), not a fake UUID.
 * Invalid refs are cleared so commit still creates the task instead of skipping it.
 */
export function normalizeProposalTaskLinks(
  items: WinstonProposalItem[]
): WinstonProposalItem[] {
  const projectTempIds = new Set<string>();
  const nameToTempId = new Map<string, string>();
  for (const item of items) {
    if (item.entityType !== "project") continue;
    projectTempIds.add(item.tempId);
    const name = asString(item.fields.project_name).trim().toLowerCase();
    if (name) nameToTempId.set(name, item.tempId);
  }

  return items.map((item) => {
    if (item.entityType !== "task") return item;

    let projectRef = asString(item.fields.projectRef).trim();
    let projectId = asString(
      item.fields.projectId ?? item.fields.project_id
    ).trim();

    if (projectId && projectTempIds.has(projectId)) {
      projectRef = projectId;
      projectId = "";
    }

    if (projectRef && !projectTempIds.has(projectRef)) {
      const byName = nameToTempId.get(projectRef.toLowerCase());
      if (byName) {
        projectRef = byName;
      } else if (isProposalUuid(projectRef) && !projectId) {
        projectId = projectRef;
        projectRef = "";
      } else {
        projectRef = "";
      }
    }

    if (projectRef) projectId = "";

    return {
      ...item,
      fields: {
        ...item.fields,
        projectRef,
        projectId,
      },
    };
  });
}

/** Model output → review items. Always selected; tasks are siblings with projectRef. */
export function normalizeGeneratedProposalItems(
  rawItems: GeneratedProposalItemInput[]
): WinstonProposalItem[] {
  const mapped = rawItems.map((item) => ({
    tempId: item.tempId?.trim() || createProposalTempId(),
    entityType: item.entityType,
    fields: { ...item.fields },
    reasoning: item.reasoning.trim(),
    selected: true,
  }));
  return normalizeProposalTaskLinks(expandNestedProposalTasks(mapped));
}

export function createdTempIdsFromResult(
  result: WinstonProposalCommitResult
): Set<string> {
  const ids = new Set<string>();
  for (const group of Object.values(result.created)) {
    for (const ref of group) {
      if (ref.tempId) ids.add(ref.tempId);
    }
  }
  return ids;
}

export function countCreatedProposalItems(
  result: WinstonProposalCommitResult
): number {
  return (
    result.created.projects.length +
    result.created.tasks.length +
    result.created.calendar_events.length +
    result.created.content_posts.length +
    result.created.ideas.length
  );
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function summarizeSelectedItems(items: WinstonProposalItem[]): string {
  const counts: Partial<Record<WinstonProposalEntityType, number>> = {};
  for (const item of items) {
    if (!item.selected) continue;
    counts[item.entityType] = (counts[item.entityType] ?? 0) + 1;
  }

  const parts: string[] = [];
  for (const type of WINSTON_PROPOSAL_ENTITY_TYPES) {
    const n = counts[type];
    if (!n) continue;
    const label = WINSTON_PROPOSAL_ENTITY_LABELS[type];
    const plural =
      n === 1
        ? label.toLowerCase()
        : type === "calendar_event"
          ? "calendar events"
          : type === "content_post"
            ? "content posts"
            : type === "idea"
              ? "ideas"
              : `${label.toLowerCase()}s`;
    parts.push(`${n} ${plural}`);
  }

  if (parts.length === 0) return "Nothing selected";
  return `${parts.join(", ")} selected`;
}
