export type ConnectionStatus = "pending" | "accepted" | "declined";

export type PublicUserProfile = {
  id: string;
  username: string;
  name: string | null;
};

export type UserConnection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  other_user?: PublicUserProfile;
};

export type ItemShareType =
  | "project"
  | "task"
  | "goal"
  | "idea"
  | "lead"
  | "content"
  | "calendar_event";

export type ItemPermission = "view" | "edit";

export type ItemShare = {
  id: string;
  owner_id: string;
  recipient_id: string;
  item_type: ItemShareType;
  item_id: string;
  permission: ItemPermission;
  created_at: string;
};
