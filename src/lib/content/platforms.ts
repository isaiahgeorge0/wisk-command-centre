import type { ContentPlatform, ContentPost } from "@/lib/content/types";

export function getPostPlatforms(post: ContentPost): ContentPlatform[] {
  if (post.platforms && post.platforms.length > 0) {
    return post.platforms as ContentPlatform[];
  }

  if (post.platform) {
    return [post.platform as ContentPlatform];
  }

  return ["Other"];
}

export function postHasPlatform(
  post: ContentPost,
  platform: ContentPlatform
): boolean {
  return getPostPlatforms(post).includes(platform);
}
