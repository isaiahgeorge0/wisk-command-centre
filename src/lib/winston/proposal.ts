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
