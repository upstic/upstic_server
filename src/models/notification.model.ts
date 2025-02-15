export enum NotificationType {
  AVAILABILITY_UPDATE = 'AVAILABILITY_UPDATE',
  AVAILABILITY_EXCEPTION = 'AVAILABILITY_EXCEPTION',
  JOB_MATCH = 'JOB_MATCH',
  SHIFT_ASSIGNED = 'SHIFT_ASSIGNED',
  SHIFT_CANCELLED = 'SHIFT_CANCELLED',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  TIMESHEET_APPROVED = 'TIMESHEET_APPROVED',
  TIMESHEET_REJECTED = 'TIMESHEET_REJECTED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  NEW_MESSAGE = 'NEW_MESSAGE'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    [key in NotificationType]?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      inApp?: boolean;
    };
  };
}
