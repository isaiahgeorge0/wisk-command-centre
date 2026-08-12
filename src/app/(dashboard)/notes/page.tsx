import { getNotes } from "@/app/(dashboard)/notes/actions";
import { NotesPageClient } from "@/components/notes/notes-page-client";
import { hasAIAccess } from "@/lib/billing/access";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NotesPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [{ data: prefs }, notes] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("ai_access")
      .eq("user_id", userId)
      .maybeSingle(),
    getNotes(),
  ]);

  const canAccessWinston = await hasAIAccess(
    userId,
    createAdminClient(),
    prefs?.ai_access ?? false
  );

  return (
    <NotesPageClient
      initialNotes={notes}
      canAccessWinston={canAccessWinston}
    />
  );
}
