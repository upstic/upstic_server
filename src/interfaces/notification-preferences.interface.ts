import { NotificationType } from '../types/notification.types';

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