import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read personalisation_completed with the service role so middleware is not
 * affected by RLS/session timing on the anon client.
 */
export async function getPersonalisationCompleted(
  userId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("personalisation_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[middleware] personalisation_completed query failed:",
      error.message,
      "userId:",
      userId
    );
    return false;
  }

  if (!data) {
    console.log(
      "[middleware] personalisation_completed: no preferences row, userId:",
      userId
    );
    return false;
  }

  const completed = data.personalisation_completed === true;
  console.log(
    "[middleware] personalisation_completed:",
    data.personalisation_completed,
    "resolved:",
    completed,
    "userId:",
    userId
  );

  return completed;
}
