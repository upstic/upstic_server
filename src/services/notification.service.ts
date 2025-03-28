import { Injectable } from '@nestjs/common';
import { Logger } from '../utils/logger';
import { NotificationType, NotificationPayload, NotificationPriority, AvailabilityNotificationType, DocumentNotificationType } from '../types/notification.types';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from '../services/email.service';
import { RedisService } from '../services/redis.service';
import { INotification } from '../interfaces/notification.interface';
import { INotificationPreferences } from '../interfaces/notification-preferences.interface';
import { TimesheetNotificationType } from '../types/timesheet-notification.types';
import { RatingNotificationType } from '../types/rating-notification.types';

// Define report notification types if they don't exist elsewhere
export enum ReportNotificationType {
  REPORT_READY = 'REPORT_READY'
}

// Define application notification types if they don't exist elsewhere
export enum ApplicationNotificationType {
  APPLICATION_STATUS = 'APPLICATION_STATUS'
}

// Define document notification types if they don't exist elsewhere
export enum DocumentExpiryNotificationType {
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY'
}

const logger = new Logger('NotificationService');

interface NotificationMessage {
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, any>;
  recipients?: string[];
}

@Injectable()
@ApiTags('Notifications')
export class NotificationService {
  constructor(
    @InjectModel('Notification') private notificationModel: Model<INotification>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService
  ) {}

  // Static method for backward compatibility
  static async notify(notification: {
    type: NotificationType;
    userId: string;
    data: any;
  }) {
    const notificationService = new NotificationService(
      null as any, // We'll need to inject these properly in a real implementation
      null as any,
      null as any
    );
    return notificationService.notify(notification);
  }

  // Instance method for NestJS
  async notify(notification: {
    type: NotificationType;
    userId: string;
    data: any;
  }) {
    try {
      await this.send({
        userId: notification.userId,
        type: notification.type,
        title: this.getNotificationTitle(notification.type),
        body: this.getNotificationBody(notification.type, notification.data),
        data: notification.data,
        priority: this.getNotificationPriority(notification.type)
      });
    } catch (error) {
      logger.error('Error in notify method:', error);
      throw error;
    }
  }

  private getNotificationTitle(type: NotificationType): string {
    // Implementation
    return '';
  }

  private getNotificationBody(type: NotificationType, data: any): string {
    // Implementation
    return '';
  }

  private getNotificationPriority(type: NotificationType): NotificationPriority {
    // Implementation
    return NotificationPriority.MEDIUM;
  }

  async sendNotification(
    recipientId: string, 
    type: NotificationType | AvailabilityNotificationType | DocumentNotificationType | TimesheetNotificationType | RatingNotificationType | ReportNotificationType | ApplicationNotificationType | DocumentExpiryNotificationType, 
    data: any
  ): Promise<void> {
    try {
      logger.info('Sending notification', { recipientId, type });
      // TODO: Implement actual notification sending logic
    } catch (error) {
      logger.error('Error sending notification:', { error, recipientId, type });
      throw error;
    }
  }

  async sendReportNotification(recipientId: string, reportId: string): Promise<void> {
    try {
      logger.info('Sending report notification', { recipientId, reportId });
      await this.sendNotification(recipientId, ReportNotificationType.REPORT_READY, { reportId });
    } catch (error) {
      logger.error('Error sending report notification:', { error, recipientId, reportId });
      throw error;
    }
  }

  @ApiOperation({ summary: 'Send a job match notification' })
  @ApiResponse({ status: 201, description: 'Job match notification sent' })
  async sendJobMatchNotification(workerId: string, jobId: string): Promise<void> {
    await this.send({
      userId: workerId,
      type: NotificationType.JOB_MATCH,
      title: 'New Job Match',
      body: 'A new job matching your profile has been found',
      data: { jobId },
      priority: NotificationPriority.MEDIUM
    });
  }

  async sendApplicationStatusNotification(workerId: string, jobId: string, status: string): Promise<void> {
    try {
      logger.info('Sending application status notification', { workerId, jobId, status });
      await this.sendNotification(workerId, ApplicationNotificationType.APPLICATION_STATUS, { jobId, status });
    } catch (error) {
      logger.error('Error sending application status notification:', { error, workerId, jobId, status });
      throw error;
    }
  }

  async sendDocumentExpiryNotification(workerId: string, documentId: string, expiryDate: Date): Promise<void> {
    try {
      logger.info('Sending document expiry notification', { workerId, documentId, expiryDate });
      await this.sendNotification(workerId, DocumentExpiryNotificationType.DOCUMENT_EXPIRY, { documentId, expiryDate });
    } catch (error) {
      logger.error('Error sending document expiry notification:', { error, workerId, documentId });
      throw error;
    }
  }

  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification payload' })
  async send(notification: NotificationPayload): Promise<void> {
    try {
      // Create notification record
      const newNotification = await this.notificationModel.create({
        ...notification,
        read: false,
        metadata: {
          createdAt: new Date(),
          channel: 'app'
        }
      });

      // Send push notification if enabled
      await this.sendPushNotification(notification);

      // Send email notification if enabled
      await this.sendEmailNotification(notification);

      // Cache notification for real-time updates
      await this.redisService.set(
        `notification:${newNotification._id}`,
        newNotification,
        3600
      );

    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  private async sendPushNotification(notification: NotificationPayload): Promise<void> {
    // Implementation using FCM or similar service
  }

  private async sendEmailNotification(notification: NotificationPayload): Promise<void> {
    // Implementation using email service
  }

  async getNotifications(userId: string): Promise<INotification[]> {
    return this.notificationModel.find({ userId }).sort({ 'metadata.createdAt': -1 });
  }

  async getNotification(id: string, userId: string): Promise<INotification | null> {
    return this.notificationModel.findOne({ _id: id, userId });
  }

  async markAsRead(id: string, userId: string): Promise<INotification | null> {
    return this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  async updatePreferences(userId: string, preferences: Partial<INotificationPreferences>): Promise<INotificationPreferences> {
    // Implementation
    return {} as INotificationPreferences;
  }

  async getPreferences(userId: string): Promise<INotificationPreferences> {
    // Implementation
    return {} as INotificationPreferences;
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await this.notificationModel.findOneAndDelete({ _id: id, userId });
  }

  async getNotificationStatistics(filters: any): Promise<any> {
    // Implementation
    return {};
  }

  async sendBulkNotifications(userId: string, data: any): Promise<any> {
    // Implementation
    return {};
  }

  async sendApplicationNotification(application: any) {
    // Implementation
  }

  async sendStatusUpdateNotification(application: any) {
    // Implementation
  }

  async sendWithdrawalNotification(application: any) {
    // Implementation
  }

  /**
   * Send a notification to all admin users
   */
  async notifyAdmins(message: NotificationMessage): Promise<void> {
    try {
      console.log(`[ADMIN NOTIFICATION] ${message.title}`);
      console.log(`Message: ${message.body}`);
      
      // In a real implementation, you would:
      // 1. Find all admin users
      // 2. Send them the notification via their preferred channels
      // 3. Log the notification in the database
      
      // For now, we'll just log it to the console
      console.log('Admin notification sent:', message);
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  }

  /**
   * Send a notification to specified recipients
   */
  async sendNotificationToRecipients(message: NotificationMessage): Promise<void> {
    try {
      console.log(`[NOTIFICATION] ${message.title}`);
      console.log(`Recipients: ${message.recipients?.join(', ') || 'None specified'}`);
      console.log(`Message: ${message.body}`);
      
      // In a real implementation, you would:
      // 1. Find the specified recipients
      // 2. Send them the notification via their preferred channels
      // 3. Log the notification in the database
      
      // For now, we'll just log it to the console
      console.log('Notification sent:', message);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

export { NotificationType, NotificationPriority };