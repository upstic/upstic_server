export enum NotificationType {
  JOB_MATCH = 'JOB_MATCH',
  APPLICATION_UPDATE = 'APPLICATION_UPDATE',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SHIFT_ASSIGNED = 'SHIFT_ASSIGNED',
  TASK_UPDATE = 'TASK_UPDATE',
  SCHEDULE_CHANGE = 'SCHEDULE_CHANGE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  INTERVIEW_REMINDER = 'INTERVIEW_REMINDER',
  INTERVIEW_FEEDBACK = 'INTERVIEW_FEEDBACK',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AvailabilityNotificationType {
  SCHEDULE_UPDATE = 'AVAILABILITY_UPDATE',
  EXCEPTION_ADDED = 'AVAILABILITY_EXCEPTION',
  EXCEPTION_DELETED = 'EXCEPTION_DELETED',
  PREFERENCES_UPDATE = 'PREFERENCES_UPDATE',
  AVAILABILITY_CONFLICT = 'AVAILABILITY_CONFLICT',
  SCHEDULE_REMINDER = 'SCHEDULE_REMINDER',
  RECRUITER_ASSIGNED = 'RECRUITER_ASSIGNED',
  WORKER_ASSIGNED = 'WORKER_ASSIGNED',
  RELIABILITY_UPDATE = 'RELIABILITY_UPDATE',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  CONFLICT_RESOLVED = 'CONFLICT_RESOLVED'
}

export enum DocumentNotificationType {
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  DOCUMENT_ACCESS_REVOKED = 'DOCUMENT_ACCESS_REVOKED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED'
}

// Import timesheet notification types
import { TimesheetNotificationType } from './timesheet-notification.types';
import { RatingNotificationType } from './rating-notification.types';

// Import the new notification types from notification.service.ts
import { ReportNotificationType, ApplicationNotificationType, DocumentExpiryNotificationType } from '../services/notification.service';

export interface INotification extends NotificationPayload {
  _id: string;
  read: boolean;
  readAt?: Date;
  metadata: {
    createdAt: Date;
    channel: string;
  };
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType | AvailabilityNotificationType | DocumentNotificationType | TimesheetNotificationType | RatingNotificationType | ReportNotificationType | ApplicationNotificationType | DocumentExpiryNotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
}