export type AccessRequestStatus = "pending" | "approved" | "declined";

export type AccessRequestFilter = "all" | AccessRequestStatus;

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  status: AccessRequestStatus;
  created_at: string;
  notes: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type AdminStats = {
  totalRequests: number;
  pendingRequests: number;
  totalUsers: number;
  requestsThisWeek: number;
  recentRequests: AccessRequest[];
  recentUsers: AdminUser[];
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  dismissal_count: number;
};

export type ActiveAnnouncement = {
  id: string;
  title: string;
  message: string;
};

export type ActionResult =
  | { success: true }
  | { success: false; error: string };
