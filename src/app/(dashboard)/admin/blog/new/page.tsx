import { BlogEditorClient } from "@/components/admin/blog/blog-editor-client";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";

export default async function NewBlogPostPage() {
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

  return <BlogEditorClient defaultAuthorName={displayName} />;
}
