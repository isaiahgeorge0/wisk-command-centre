"use server";

import { createCalendarEvent } from "@/app/(dashboard)/calendar/actions";
import { createContentPost } from "@/app/(dashboard)/content/actions";
import { createIdea } from "@/app/(dashboard)/ideas/actions";
import { createAwaitingDateNotification } from "@/app/(dashboard)/notifications/actions";
import { createProject } from "@/app/(dashboard)/projects/actions";
import { createTask } from "@/app/(dashboard)/tasks/actions";
import { CONTENT_PLATFORMS, CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/content/types";
import type { ContentPlatform, ContentStatus, ContentType } from "@/lib/content/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";
import type { IdeaStatus } from "@/lib/ideas/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import type { ProjectStatus } from "@/lib/projects/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import type { TaskPriority } from "@/lib/tasks/types";
import type { ActionResult } from "@/lib/tasks/types";
import {
  asString,
  asStringArray,
  type WinstonProposal,
  type WinstonProposalCommitResult,
  type WinstonProposalItem,
} from "@/lib/winston/proposal";

function emptyResult(): WinstonProposalCommitResult {
  return {
    created: {
      projects: [],
      tasks: [],
      calendar_events: [],
      content_posts: [],
      ideas: [],
    },
    errors: [],
  };
}

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

function isContentPlatform(value: string): value is ContentPlatform {
  return (CONTENT_PLATFORMS as readonly string[]).includes(value);
}

function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

function isContentStatus(value: string): value is ContentStatus {
  return (CONTENT_STATUSES as readonly string[]).includes(value);
}

function isCalendarEventType(value: string): value is "lifestyle" | "other" {
  return value === "lifestyle" || value === "other";
}

function isIdeaStatus(value: string): value is IdeaStatus {
  return (IDEA_STATUSES as readonly string[]).includes(value);
}

/**
 * Commits selected proposal items via existing entity creation actions.
 * Projects are created first so tasks can resolve `projectRef` tempIds.
 * Partial success is allowed — per-item failures are collected in `errors`.
 */
export async function commitWinstonProposal(
  items: WinstonProposalItem[],
  options?: { source?: Pick<WinstonProposal, "sourceType" | "sourceId"> }
): Promise<ActionResult<WinstonProposalCommitResult>> {
  const selected = items.filter((item) => item.selected);
  if (selected.length === 0) {
    return { success: false, error: "Select at least one item to create" };
  }

  const result = emptyResult();
  const projectIdByTempId = new Map<string, string>();

  const projects = selected.filter((i) => i.entityType === "project");
  const tasks = selected.filter((i) => i.entityType === "task");
  const events = selected.filter((i) => i.entityType === "calendar_event");
  const posts = selected.filter((i) => i.entityType === "content_post");
  const ideas = selected.filter((i) => i.entityType === "idea");

  for (const item of projects) {
    const project_name = asString(item.fields.project_name).trim();
    const service_type =
      asString(item.fields.service_type).trim() || "Other";
    const statusRaw = asString(item.fields.status, "active");
    const status = isProjectStatus(statusRaw) ? statusRaw : "active";

    if (!project_name) {
      result.errors.push("Skipped a project with no name");
      continue;
    }

    const created = await createProject({
      project_name,
      service_type,
      status,
      source_note_id:
        options?.source?.sourceType === "note"
          ? options.source.sourceId
          : undefined,
      client_name: asString(item.fields.client_name) || undefined,
      deadline: asString(item.fields.deadline) || undefined,
      notes: asString(item.fields.notes) || undefined,
      next_action: asString(item.fields.next_action) || undefined,
      value: asString(item.fields.value) || undefined,
    });

    if (!created.success || !created.data) {
      result.errors.push(
        created.success === false
          ? created.error
          : `Could not create project “${project_name}”`
      );
      continue;
    }

    projectIdByTempId.set(item.tempId, created.data.id);
    result.created.projects.push({
      id: created.data.id,
      label: created.data.project_name,
      href: "/projects",
    });
  }

  for (const item of tasks) {
    const title = asString(item.fields.title).trim();
    if (!title) {
      result.errors.push("Skipped a task with no title");
      continue;
    }

    const priorityRaw = asString(item.fields.priority, "medium");
    const priority = isTaskPriority(priorityRaw) ? priorityRaw : "medium";

    const projectRef = asString(item.fields.projectRef).trim();
    const existingProjectId = asString(
      item.fields.projectId ?? item.fields.project_id
    ).trim();

    let project_id: string | undefined;
    if (projectRef) {
      const resolved = projectIdByTempId.get(projectRef);
      if (!resolved) {
        result.errors.push(
          `Task “${title}” linked to a project that wasn’t created — create the project or clear the link`
        );
        continue;
      }
      project_id = resolved;
    } else if (existingProjectId) {
      project_id = existingProjectId;
    }

    const created = await createTask({
      title,
      priority,
      project_id,
      due_date: asString(item.fields.due_date) || undefined,
      raw_content: asString(item.fields.raw_content) || undefined,
    });

    if (!created.success || !created.data) {
      result.errors.push(
        created.success === false
          ? created.error
          : `Could not create task “${title}”`
      );
      continue;
    }

    result.created.tasks.push({
      id: created.data.id,
      label: created.data.title,
      href: "/tasks",
    });
  }

  for (const item of events) {
    const title = asString(item.fields.title).trim();
    const date = asString(item.fields.date).trim();
    if (!title || !date) {
      result.errors.push(
        `Skipped a calendar event${title ? ` “${title}”` : ""} — title and date are required`
      );
      continue;
    }

    const eventTypeRaw = asString(item.fields.event_type, "lifestyle");
    const event_type = isCalendarEventType(eventTypeRaw)
      ? eventTypeRaw
      : "lifestyle";

    const created = await createCalendarEvent({
      title,
      date,
      end_date: asString(item.fields.end_date) || undefined,
      event_type,
      notes: asString(item.fields.notes) || undefined,
    });

    if (!created.success || !created.data) {
      result.errors.push(
        created.success === false
          ? created.error
          : `Could not create calendar event “${title}”`
      );
      continue;
    }

    result.created.calendar_events.push({
      id: created.data.id,
      label: created.data.title,
      href: "/calendar",
    });
  }

  for (const item of posts) {
    const title = asString(item.fields.title).trim();
    if (!title) {
      result.errors.push("Skipped a content post with no title");
      continue;
    }

    const platformsRaw = asStringArray(item.fields.platforms);
    const platforms = platformsRaw.filter(isContentPlatform);
    const safePlatforms: ContentPlatform[] =
      platforms.length > 0 ? platforms : ["TikTok"];

    const typeRaw = asString(item.fields.content_type, "Video");
    const content_type = isContentType(typeRaw) ? typeRaw : "Video";

    const statusRaw = asString(item.fields.status, "idea");
    const status = isContentStatus(statusRaw) ? statusRaw : "idea";

    const created = await createContentPost({
      title,
      platforms: safePlatforms,
      content_type,
      status,
      scheduled_date: asString(item.fields.scheduled_date) || undefined,
      description: asString(item.fields.description) || undefined,
      hook: asString(item.fields.hook) || undefined,
    });

    if (!created.success || !created.data) {
      result.errors.push(
        created.success === false
          ? created.error
          : `Could not create content post “${title}”`
      );
      continue;
    }

    result.created.content_posts.push({
      id: created.data.id,
      label: created.data.title,
      href: "/content",
    });

    if (!asString(item.fields.scheduled_date).trim()) {
      await createAwaitingDateNotification({
        referenceId: created.data.id,
        title: created.data.title,
        linkTo: "/content",
      });
    }
  }

  for (const item of ideas) {
    const title = asString(item.fields.title).trim();
    if (!title) {
      result.errors.push("Skipped an idea with no title");
      continue;
    }

    const statusRaw = asString(item.fields.status, "awaiting-date");
    const status = isIdeaStatus(statusRaw) ? statusRaw : "awaiting-date";

    const created = await createIdea({
      title,
      description: asString(item.fields.description) || undefined,
      category: asString(item.fields.category) || "Calendar",
      status,
    });

    if (!created.success || !created.data) {
      result.errors.push(
        created.success === false
          ? created.error
          : `Could not create idea “${title}”`
      );
      continue;
    }

    result.created.ideas.push({
      id: created.data.id,
      label: created.data.title,
      href: "/ideas",
    });

    await createAwaitingDateNotification({
      referenceId: created.data.id,
      title: created.data.title,
      linkTo: "/ideas",
    });
  }

  const totalCreated =
    result.created.projects.length +
    result.created.tasks.length +
    result.created.calendar_events.length +
    result.created.content_posts.length +
    result.created.ideas.length;

  if (totalCreated === 0) {
    return {
      success: false,
      error:
        result.errors[0] ??
        "Nothing was created. Check the proposed items and try again.",
    };
  }

  return { success: true, data: result };
}
