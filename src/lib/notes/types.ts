export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteFormInput = {
  title: string;
  content: string | null;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
