import { getNotes } from "@/app/(dashboard)/notes/actions";
import { NotesPageClient } from "@/components/notes/notes-page-client";

export default async function NotesPage() {
  const notes = await getNotes();

  return <NotesPageClient initialNotes={notes} />;
}
