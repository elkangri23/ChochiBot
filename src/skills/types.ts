// Types and interfaces for Google Workspace skills
// Cumple con deployment-standards.md - tipado estricto

export interface GogCommand {
  service: string;
  action: string;
  params: Record<string, any>;
}

export interface SkillResponse {
  status: "success" | "error" | "pending_human_approval";
  message?: string;
  command?: string;
  output?: string;
  toolName?: string;
  toolArgs?: any;
  [key: string]: any;
}

// Gmail Assistant Types
export interface GmailActionParams {
  action: "search" | "send" | "send_reply" | "recent" | "unread" | "from_sender";
  query?: string;
  to?: string;
  subject?: string;
  message?: string;
  sender?: string;
  days?: number;
  limit?: number;
  replyToMessageId?: string;
  account?: string;
  bypassApproval?: boolean;
}

// Calendar Manager Types  
export interface CalendarActionParams {
  action: "upcoming" | "today" | "create_event" | "create_meeting" | "show_colors" | "busy_check";
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  color?: number;
  calendar_id?: string;
  days_ahead?: number;
  bypassApproval?: boolean;
}

// Google Workspace Types
export interface GoogleWorkspaceParams {
  service: "gmail" | "calendar" | "drive" | "contacts" | "sheets" | "docs" | "auth";
  action: string;
  params?: {
    to?: string;
    subject?: string;
    body?: string;
    query?: string;
    max?: number;
    account?: string;
    calendarId?: string;
    summary?: string;
    from?: string;
    to_time?: string;
    eventColor?: number;
    eventId?: string;
    driveQuery?: string;
    sheetId?: string;
    range?: string;
    values?: string;
    docId?: string;
    format?: string;
    output?: string;
  };
  bypassApproval?: boolean;
}

// Setup Types
export interface GogSetupParams {
  action: "install_check" | "auth_status" | "add_account" | "list_accounts" | "setup_guide" | "test_services";
  email?: string;
  services?: string;
  credentials_path?: string;
  bypassApproval?: boolean;
}

// Validation utilities
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^\d{2}:\d{2}$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validateDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

export function validateTime(time: string): boolean {
  if (!TIME_REGEX.test(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function validateEventColor(color: number): boolean {
  return Number.isInteger(color) && color >= 1 && color <= 11;
}