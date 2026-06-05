import type { ContentFormInput, ContentPost } from "@/lib/content/types";
import type { ContentPlatform, ContentStatus, ContentType } from "@/lib/content/types";

export const EMPTY_CONTENT_FORM: ContentFormInput = {
  title: "",
  platform: "TikTok",
  content_type: "Video",
  status: "idea",
  scheduled_date: "",
  published_date: "",
  hook: "",
  description: "",
  tags: "",
  goal_id: "",
};

export function postToFormInput(post: ContentPost): ContentFormInput {
  return {
    title: post.title,
    platform: (post.platform as ContentPlatform) ?? "TikTok",
    content_type: (post.content_type as ContentType) ?? "Video",
    status: (post.status as ContentStatus) ?? "idea",
    scheduled_date: post.scheduled_date ?? "",
    published_date: post.published_date ?? "",
    hook: post.hook ?? "",
    description: post.description ?? "",
    tags: post.tags?.join(", ") ?? "",
    goal_id: post.goal_id ?? "",
  };
}
