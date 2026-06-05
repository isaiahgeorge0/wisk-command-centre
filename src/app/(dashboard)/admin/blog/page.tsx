import Link from "next/link";

import { getBlogPosts } from "@/app/(dashboard)/admin/blog/actions";
import { BlogListClient } from "@/components/admin/blog/blog-list-client";
import { buttonVariants } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default async function AdminBlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Blog</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Write and publish posts for the WISK marketing site at wiskapp.com/blog.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className={cn(buttonVariants(), "shrink-0")}
        >
          New post
        </Link>
      </div>
      <BlogListClient posts={posts} />
    </div>
  );
}
