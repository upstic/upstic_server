import mongoose, { Schema } from 'mongoose';
import { INotification, NotificationType, NotificationPriority } from '../types/notification.types';

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app'
}

export interface INotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  actions?: Array<{
    name: string;
    title: string;
    url?: string;
  }>;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  deviceTokens?: string[];
  metadata: {
    createdAt: Date;
    sender?: string;
    channel?: string;
    deviceInfo?: string;
  };
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM
  },
  channels: [{
    type: String,
    enum: Object.values(NotificationChannel),
    required: true
  }],
  data: {
    type: Map,
    of: Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  expiresAt: Date,
  actions: [{
    name: String,
    title: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  error: String,
  deviceTokens: [String],
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    sender: String,
    channel: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ 'metadata.createdAt': 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 