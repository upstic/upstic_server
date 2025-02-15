import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { EmailService } from '../../services/email.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { ValidationService } from '../../services/validation.service';
import { TemplateService } from '../../services/template.service';

@Injectable()
export class NotificationHandler {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMITS = {
    email: 100,    // per minute
    push: 1000,    // per minute
    sms: 50        // per minute
  };
  private readonly PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'] as const;

  constructor(
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('Template') private templateModel: Model<any>,
    @InjectModel('Preference') private preferenceModel: Model<any>,
    private emailService: EmailService,
    private pushNotificationService: PushNotificationService,
    private templateService: TemplateService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async sendNotification(
    input: NotificationInput
  ): Promise<NotificationResponse> {
    try {
      // Validate notification request
      await this.validateNotification(input);

      // Check rate limits
      await this.checkRateLimits(input.channels);

      // Get recipient preferences
      const preferences = await this.getRecipientPreferences(input.recipients);

      // Process templates
      const content = await this.processTemplates(input.templateId, input.data);

      // Create notification record
      const notification = await this.notificationModel.create({
        ...input,
        content,
        status: 'pending',
        createdAt: new Date()
      });

      // Send notifications asynchronously
      this.sendAsync(notification, preferences).catch(error => {
        this.logger.error('Error sending notification:', error);
        this.updateNotificationStatus(
          notification._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        notificationId: notification._id,
        message: 'Notification queued successfully'
      };
    } catch (error) {
      this.logger.error('Error processing notification:', error);
      throw error;
    }
  }

  async scheduleNotification(
    input: ScheduleInput
  ): Promise<ScheduleResponse> {
    try {
      // Validate schedule request
      await this.validateSchedule(input);

      // Create schedule record
      const schedule = await this.notificationModel.create({
        ...input,
        status: 'scheduled',
        createdAt: new Date()
      });

      // Set up schedule trigger
      await this.setupScheduleTrigger(schedule);

      return {
        success: true,
        scheduleId: schedule._id,
        message: 'Notification scheduled successfully'
      };
    } catch (error) {
      this.logger.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async trackDelivery(
    input: DeliveryInput
  ): Promise<DeliveryResponse> {
    try {
      // Validate delivery data
      await this.validateDelivery(input);

      // Update notification status
      const delivery = await this.notificationModel.findByIdAndUpdate(
        input.notificationId,
        {
          $set: {
            'delivery': input,
            'status': input.status,
            'updatedAt': new Date()
          }
        },
        { new: true }
      );

      if (!delivery) {
        throw new Error('Notification not found');
      }

      // Process delivery metrics
      await this.processDeliveryMetrics(delivery);

      // Handle failed deliveries
      if (input.status === 'failed') {
        await this.handleFailedDelivery(delivery);
      }

      return {
        success: true,
        deliveryId: delivery._id,
        status: input.status
      };
    } catch (error) {
      this.logger.error('Error tracking delivery:', error);
      throw error;
    }
  }

  private async sendAsync(
    notification: any,
    preferences: any[]
  ): Promise<void> {
    try {
      // Group recipients by channel preference
      const groups = this.groupByPreference(
        notification.recipients,
        preferences
      );

      // Send to each channel group
      for (const [channel, recipients] of Object.entries(groups)) {
        // Process in batches
        for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
          const batch = recipients.slice(i, i + this.BATCH_SIZE);
          await this.sendBatch(notification, batch, channel);
        }
      }

      // Update notification status
      await this.updateNotificationStatus(
        notification._id,
        'completed'
      );
    } catch (error) {
      throw error;
    }
  }

  private async processTemplates(
    templateId: string,
    data: Record<string, any>
  ): Promise<ProcessedContent> {
    const template = await this.templateModel.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return {
      email: await this.templateService.process(template.email, data),
      push: await this.templateService.process(template.push, data),
      sms: await this.templateService.process(template.sms, data)
    };
  }
}

interface NotificationInput {
  recipients: string[];
  channels: Array<'email' | 'push' | 'sms'>;
  templateId: string;
  data: Record<string, any>;
  priority?: typeof NotificationHandler.prototype.PRIORITY_LEVELS[number];
  metadata?: Record<string, any>;
}

interface NotificationResponse {
  success: boolean;
  notificationId: string;
  message: string;
}

interface ScheduleInput extends NotificationInput {
  schedule: {
    type: 'once' | 'recurring';
    datetime: Date;
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      endDate?: Date;
    };
  };
}

interface ScheduleResponse {
  success: boolean;
  scheduleId: string;
  message: string;
}

interface DeliveryInput {
  notificationId: string;
  status: 'delivered' | 'failed' | 'bounced';
  channel: string;
  timestamp: Date;
  details?: {
    error?: string;
    provider?: string;
    metadata?: Record<string, any>;
  };
}

interface DeliveryResponse {
  success: boolean;
  deliveryId: string;
  status: string;
}

interface ProcessedContent {
  email?: {
    subject: string;
    body: string;
    html?: string;
  };
  push?: {
    title: string;
    body: string;
    data?: Record<string, any>;
  };
  sms?: string;
}

interface NotificationPreference {
  userId: string;
  channels: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  schedule?: {
    quiet_hours?: {
      start: string;
      end: string;
    };
    timezone: string;
  };
  filters?: {
    types?: string[];
    priority?: string[];
  };
}

interface DeliveryMetrics {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  byChannel: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
  byPriority: Record<string, number>;
  averageLatency: number;
}