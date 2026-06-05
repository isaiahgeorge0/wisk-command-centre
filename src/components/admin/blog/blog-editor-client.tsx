"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  publishBlogPostFromForm,
  saveBlogPostDraft,
} from "@/app/(dashboard)/admin/blog/actions";
import { BlogMarkdownPreview } from "@/components/admin/blog/blog-markdown-preview";
import { BlogMarkdownToolbar } from "@/components/admin/blog/blog-markdown-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { emptyBlogForm, postToFormInput, todayDateISO } from "@/lib/blog/format";
import { slugifyTitle } from "@/lib/blog/slug";
import type { BlogFormInput, BlogPost } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type BlogEditorClientProps = {
  post?: BlogPost;
  defaultAuthorName: string;
};

type ContentTab = "write" | "preview";

function serializeForm(values: BlogFormInput): string {
  return JSON.stringify(values);
}

export function BlogEditorClient({
  post,
  defaultAuthorName,
}: BlogEditorClientProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialValues = useMemo(
    () => (post ? postToFormInput(post) : emptyBlogForm(defaultAuthorName)),
    [post, defaultAuthorName]
  );
  const initialSnapshot = useMemo(
    () => serializeForm(initialValues),
    [initialValues]
  );

  const [values, setValues] = useState<BlogFormInput>(initialValues);
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [contentTab, setContentTab] = useState<ContentTab>("write");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = serializeForm(values) !== initialSnapshot;

  const setField = <K extends keyof BlogFormInput>(
    key: K,
    value: BlogFormInput[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setValues((current) => {
      const next = { ...current, title };
      if (!slugTouched) {
        next.slug = slugifyTitle(title);
      }
      return next;
    });
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    setField("slug", slug);
  };

  const handlePublishedChange = (published: boolean) => {
    setValues((current) => ({
      ...current,
      published,
      published_at: published
        ? current.published_at || todayDateISO()
        : current.published_at,
    }));
  };

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave without saving?"
    );
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (confirmLeave()) return;
    event.preventDefault();
  };

  const saveDraft = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveBlogPostDraft(post?.id ?? null, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    });
  };

  const publish = () => {
    setError(null);
    startTransition(async () => {
      const result = await publishBlogPostFromForm(post?.id ?? null, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/blog"
            onClick={handleNavigate}
            className="text-sm text-muted-foreground transition-colors hover:text-orange-700 dark:hover:text-orange-300"
          >
            ← Back to blog
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {post ? "Edit post" : "New post"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={saveDraft}
          >
            {isPending ? "Saving…" : "Save as draft"}
          </Button>
          <Button type="button" disabled={isPending} onClick={publish}>
            {isPending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="grid gap-2">
            <Label htmlFor="blog-title">Title *</Label>
            <Input
              id="blog-title"
              value={values.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="blog-slug">Slug *</Label>
            <Input
              id="blog-slug"
              value={values.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              wiskapp.com/blog/{values.slug || "your-post-slug"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="blog-excerpt">Excerpt *</Label>
            <Textarea
              id="blog-excerpt"
              value={values.excerpt}
              onChange={(event) => setField("excerpt", event.target.value)}
              disabled={isPending}
              rows={3}
              required
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="blog-content">Content *</Label>
              <div className="flex rounded-lg border border-border/60 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    contentTab === "write"
                      ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setContentTab("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    contentTab === "preview"
                      ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setContentTab("preview")}
                >
                  Preview
                </button>
              </div>
            </div>

            {contentTab === "write" ? (
              <>
                <BlogMarkdownToolbar
                  textareaRef={textareaRef}
                  value={values.content}
                  onChange={(content) => setField("content", content)}
                  disabled={isPending}
                />
                <Textarea
                  ref={textareaRef}
                  id="blog-content"
                  value={values.content}
                  onChange={(event) => setField("content", event.target.value)}
                  disabled={isPending}
                  rows={18}
                  className="min-h-[24rem] rounded-t-none font-mono text-sm"
                  required
                />
              </>
            ) : (
              <div className="min-h-[24rem] rounded-lg border border-border/60 bg-card/60 p-4">
                <BlogMarkdownPreview content={values.content} />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="grid gap-2">
            <Label htmlFor="blog-cover">Cover image URL</Label>
            <Input
              id="blog-cover"
              value={values.cover_image_url}
              onChange={(event) =>
                setField("cover_image_url", event.target.value)
              }
              disabled={isPending}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="blog-tags">Tags</Label>
            <Input
              id="blog-tags"
              value={values.tags}
              onChange={(event) => setField("tags", event.target.value)}
              disabled={isPending}
              placeholder="Comma-separated tags"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="blog-author">Author name *</Label>
            <Input
              id="blog-author"
              value={values.author_name}
              onChange={(event) => setField("author_name", event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3">
            <div>
              <Label htmlFor="blog-published">Published</Label>
              <p className="text-xs text-muted-foreground">
                Off saves as draft
              </p>
            </div>
            <Switch
              id="blog-published"
              checked={values.published}
              onCheckedChange={handlePublishedChange}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="blog-published-at">Published date</Label>
            <Input
              id="blog-published-at"
              type="date"
              value={values.published_at}
              onChange={(event) =>
                setField("published_at", event.target.value)
              }
              disabled={isPending || !values.published}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
