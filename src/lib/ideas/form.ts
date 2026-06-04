import type { Idea, IdeaFormInput } from "@/lib/ideas/types";
import { IDEA_STATUSES, type IdeaStatus } from "@/lib/ideas/types";

export const EMPTY_IDEA_FORM: IdeaFormInput = {
  title: "",
  description: "",
  category: "",
  status: "new",
};

export function ideaToFormInput(idea: Idea): IdeaFormInput {
  return {
    title: idea.title,
    description: idea.description ?? "",
    category: idea.category ?? "",
    status: isIdeaStatus(idea.status) ? idea.status : "new",
  };
}

function isIdeaStatus(status: string | null): status is IdeaStatus {
  return IDEA_STATUSES.includes(status as IdeaStatus);
}
