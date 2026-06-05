import { notFound } from "next/navigation";

import { getBlogPost } from "@/app/(dashboard)/admin/blog/actions";
import { BlogEditorClient } from "@/components/admin/blog/blog-editor-client";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

type EditBlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;
  const post = await getBlogPost(id);

  if (!post) {
    notFound();
  }

  const { user } = await getAuthContext();
  const preferences = await getOrCreateUserPreferences();
  const displayName = resolveDisplayName({
    displayName: preferences.displayName,
    profileName:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null,
    email: user.email ?? "",
  });

  return <BlogEditorClient post={post} defaultAuthorName={displayName} />;
}
