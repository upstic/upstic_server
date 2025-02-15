import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { EmailService } from '../../services/email.service';
import { SMSService } from '../../services/sms.service';
import { PushService } from '../../services/push.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class NotificationManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMITS = {
    email: 50,  // per minute
    sms: 20,    // per minute
    push: 100   // per minute
  };

  constructor(
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('Template') private templateModel: Model<any>,
    @InjectModel('Preference') private preferenceModel: Model<any>,
    private emailService: EmailService,
    private smsService: SMSService,
    private pushService: PushService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async sendNotification(
    input: NotificationInput
  ): Promise<NotificationResponse> {
    try {
      // Validate notification data
      await this.validateNotification(input);

      // Create notification record
      const notification = await this.notificationModel.create({
        ...input,
        status: 'pending',
        createdAt: new Date()
      });

      // Process notification
      this.processNotification(notification).catch(error => {
        this.logger.error('Error processing notification:', error);
        this.updateNotificationStatus(notification._id, 'failed', error.message);
      });

      return {
        success: true,
        notificationId: notification._id,
        message: 'Notification queued successfully'
      };
    } catch (error) {
      this.logger.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendBulkNotifications(
    input: BulkNotificationInput
  ): Promise<BulkNotificationResponse> {
    try {
      // Validate bulk input
      await this.validateBulkNotification(input);

      // Create bulk notification record
      const bulkNotification = await this.notificationModel.create({
        ...input,
        type: 'bulk',
        status: 'processing',
        createdAt: new Date()
      });

      // Process bulk notifications
      this.processBulkNotifications(bulkNotification).catch(error => {
        this.logger.error('Error processing bulk notifications:', error);
        this.updateNotificationStatus(
          bulkNotification._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        bulkId: bulkNotification._id,
        message: 'Bulk notifications queued successfully'
      };
    } catch (error) {
      this.logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  async getNotificationStatus(
    notificationId: string
  ): Promise<NotificationStatus> {
    const cacheKey = `notification:status:${notificationId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const notification = await this.notificationModel.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const status = await this.calculateNotificationStatus(notification);
    await this.cacheService.set(cacheKey, status, this.CACHE_TTL);

    return status;
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<PreferenceResponse> {
    try {
      const updated = await this.preferenceModel.findOneAndUpdate(
        { userId },
        { preferences },
        { upsert: true, new: true }
      );

      return {
        success: true,
        userId,
        preferences: updated.preferences
      };
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  private async processNotification(
    notification: any
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getPreferences(notification.userId);

      // Check if user has opted out
      if (this.hasOptedOut(preferences, notification.type)) {
        await this.updateNotificationStatus(
          notification._id,
          'skipped',
          'User opted out'
        );
        return;
      }

      // Get template
      const template = await this.getTemplate(notification.templateId);

      // Prepare content
      const content = await this.prepareContent(
        template,
        notification.data
      );

      // Send through preferred channels
      const results = await this.sendThroughChannels(
        notification,
        content,
        preferences
      );

      // Update notification status
      await this.updateNotificationStatus(
        notification._id,
        this.determineStatus(results),
        null,
        results
      );

    } catch (error) {
      this.logger.error('Error processing notification:', error);
      throw error;
    }
  }

  private async processBulkNotifications(
    bulkNotification: any
  ): Promise<void> {
    try {
      const recipients = await this.getRecipients(bulkNotification.recipients);
      const template = await this.getTemplate(bulkNotification.templateId);

      // Process recipients in batches
      for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
        const batch = recipients.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(bulkNotification, batch, template);
        await this.delay(1000 / this.RATE_LIMITS.email * this.BATCH_SIZE);
      }

      // Update bulk notification status
      await this.updateNotificationStatus(
        bulkNotification._id,
        'completed'
      );

    } catch (error) {
      this.logger.error('Error processing bulk notifications:', error);
      throw error;
    }
  }

  private async sendThroughChannels(
    notification: any,
    content: any,
    preferences: any
  ): Promise<ChannelResults> {
    const results: ChannelResults = {};

    if (preferences.email && content.email) {
      results.email = await this.emailService.send({
        to: notification.userId,
        subject: content.email.subject,
        body: content.email.body
      });
    }

    if (preferences.sms && content.sms) {
      results.sms = await this.smsService.send({
        to: notification.userId,
        message: content.sms
      });
    }

    if (preferences.push && content.push) {
      results.push = await this.pushService.send({
        userId: notification.userId,
        title: content.push.title,
        body: content.push.body,
        data: content.push.data
      });
    }

    return results;
  }

  private determineStatus(
    results: ChannelResults
  ): string {
    const statuses = Object.values(results).map(r => r.status);
    if (statuses.every(s => s === 'success')) return 'delivered';
    if (statuses.every(s => s === 'failed')) return 'failed';
    return 'partial';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface NotificationInput {
  userId: string;
  type: string;
  templateId: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  channels?: string[];
}

interface BulkNotificationInput {
  recipients: {
    type: 'all' | 'segment' | 'list';
    data: any;
  };
  templateId: string;
  data?: Record<string, any>;
  channels?: string[];
}

interface NotificationResponse {
  success: boolean;
  notificationId: string;
  message: string;
}

interface BulkNotificationResponse {
  success: boolean;
  bulkId: string;
  message: string;
}

interface NotificationStatus {
  status: string;
  channels: Record<string, {
    status: string;
    timestamp: Date;
    error?: string;
  }>;
  attempts: number;
  lastAttempt: Date;
}

interface NotificationPreferences {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  quiet_hours?: {
    start: string;
    end: string;
    timezone: string;
  };
  categories?: Record<string, boolean>;
}

interface PreferenceResponse {
  success: boolean;
  userId: string;
  preferences: NotificationPreferences;
}

interface ChannelResults {
  email?: {
    status: string;
    messageId?: string;
    error?: string;
  };
  sms?: {
    status: string;
    messageId?: string;
    error?: string;
  };
  push?: {
    status: string;
    messageId?: string;
    error?: string;
  };
} 