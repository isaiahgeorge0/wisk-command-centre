import type { FieldVisibility } from "@/lib/preferences/types";

export const DEFAULT_SERVICE_TYPES = [
  "Web Development",
  "App Development",
  "Social Media Marketing",
  "Branding",
  "Content Creation",
  "Videography",
  "SEO",
  "Consultancy",
] as const;

export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  projects: {
    serviceType: true,
    deadline: true,
    value: true,
    nextAction: true,
    siteUrl: true,
    notes: true,
  },
  tasks: {
    priorityBadge: true,
    projectTag: true,
    dueDate: true,
  },
  goals: {
    categoryTag: true,
    deadline: true,
    quickControls: true,
  },
  ideas: {
    categoryTag: true,
    statusBadge: true,
  },
};
