export enum NotificationType {
  JOB_MATCH = 'JOB_MATCH',
  APPLICATION_UPDATE = 'APPLICATION_UPDATE',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SHIFT_ASSIGNED = 'SHIFT_ASSIGNED',
  TASK_UPDATE = 'TASK_UPDATE',
  SCHEDULE_CHANGE = 'SCHEDULE_CHANGE'
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
  SCHEDULE_REMINDER = 'SCHEDULE_REMINDER'
}

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
  type: NotificationType | AvailabilityNotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
}