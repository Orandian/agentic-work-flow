// ── Shared ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStaff: number;
  newStaffThisMonth: number;
  activeTasks: number;
  tasksDueToday: number;
  totalDocuments: number;
  newDocumentsThisWeek: number;
  pendingNotices: number;
  urgentNotices: number;
}

export interface ActivityItem {
  userName: string;
  userInitials: string;
  action: string;
  timeAgo: string;
  type: "document" | "task" | "staff" | "notice";
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  userType: "ADMIN" | "STAFF";
  status: 1 | 2; // 1=active, 2=locked
  latestLoginAt: string | null;
  createdAt: string;
}

export interface StaffStats {
  total: number;
  active: number;
  locked: number;
  newThisMonth: number;
  byDepartment: Record<string, number>;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  department: string;
  position: string;
  password: string;
  userType: "STAFF" | "ADMIN";
}

export interface UpdateStaffPayload {
  name: string;
  department: string;
  position: string;
  password?: string;
  userType: "STAFF" | "ADMIN";
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskCategory = "IT" | "HR" | "FACILITIES" | "FINANCE" | "OTHER";

export interface Task {
  id: number;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToName: string | null;
  assignedToId: number | null;
  dueDate: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TaskStats {
  active: number;
  dueToday: number;
  completedThisWeek: number;
}

export interface SaveTaskPayload {
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status?: TaskStatus;
  assignedTo?: number | null;
  dueDate?: string;
}

// ── Notices ───────────────────────────────────────────────────────────────────

export type NoticeType = "GENERAL" | "URGENT" | "HOLIDAY" | "POLICY";
export type NoticeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Notice {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  status: NoticeStatus;
  pinned: boolean;
  postedByName: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SaveNoticePayload {
  title: string;
  content: string;
  type: NoticeType;
  pinned: boolean;
  status?: NoticeStatus;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  userType: "ADMIN" | "STAFF";
  createdAt: string;
}

export interface UpdateProfilePayload {
  name: string;
  department?: string;
  position?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
