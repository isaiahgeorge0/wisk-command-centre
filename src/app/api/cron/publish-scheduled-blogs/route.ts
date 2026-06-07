import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: postsToPublish, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, title, slug")
    .eq("published", false)
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now);

  if (fetchError) {
    console.error("Cron - fetch scheduled posts:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch scheduled posts" },
      { status: 500 }
    );
  }

  if (!postsToPublish || postsToPublish.length === 0) {
    return NextResponse.json({ published: 0, message: "No posts due" });
  }

  const ids = postsToPublish.map((p) => p.id);

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({
      published: true,
      published_at: now,
      scheduled_for: null,
    })
    .in("id", ids);

  if (updateError) {
    console.error("Cron - publish scheduled posts:", updateError);
    return NextResponse.json(
      { error: "Failed to publish posts" },
      { status: 500 }
    );
  }

  console.log(
    `Cron - published ${postsToPublish.length} scheduled post(s):`,
    postsToPublish.map((p) => p.slug).join(", ")
  );

  return NextResponse.json({
    published: postsToPublish.length,
    posts: postsToPublish.map((p) => ({ title: p.title, slug: p.slug })),
  });
}
