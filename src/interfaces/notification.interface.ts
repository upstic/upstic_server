import { Document } from 'mongoose';
import { NotificationType, NotificationPriority } from '../types/notification.types';

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  read: boolean;
  readAt?: Date;
  metadata: {
    createdAt: Date;
    channel: string;
  };
}

export interface INotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  enabledTypes: NotificationType[];
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  schedules: {
    startTime: string;
    endTime: string;
    timezone: string;
    daysOfWeek: number[];
  };
} 