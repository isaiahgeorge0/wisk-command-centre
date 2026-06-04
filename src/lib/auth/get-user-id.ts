/**
 * TODO(auth): Replace with the authenticated user's id from the session:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) throw new Error("Unauthorized");
 *   return user.id;
 */
export async function getActorUserId(): Promise<string> {
  const userId = process.env.TEST_USER_ID;

  if (!userId) {
    throw new Error(
      "TEST_USER_ID is not set. Add it to .env.local until auth is implemented."
    );
  }

  return userId;
}
