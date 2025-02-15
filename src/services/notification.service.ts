import { Injectable } from '@nestjs/common';
import { Logger } from '../utils/logger';
import { NotificationType, NotificationPayload, NotificationPriority } from '../types/notification.types';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

const logger = new Logger('NotificationService');

@Injectable()
@ApiTags('Notifications')
export class NotificationService {
  // Static method for backward compatibility
  static async notify(notification: {
    type: NotificationType;
    userId: string;
    data: any;
  }) {
    return new NotificationService().notify(notification);
  }

  // Instance method for NestJS
  async notify(notification: {
    type: NotificationType;
    userId: string;
    data: any;
  }) {
    // Implementation
    // Send notification logic here
  }

  async sendNotification(recipientId: string, type: string, data: any): Promise<void> {
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
      await this.sendNotification(recipientId, 'REPORT_READY', { reportId });
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
      await this.sendNotification(workerId, 'APPLICATION_STATUS', { jobId, status });
    } catch (error) {
      logger.error('Error sending application status notification:', { error, workerId, jobId, status });
      throw error;
    }
  }

  async sendDocumentExpiryNotification(workerId: string, documentId: string, expiryDate: Date): Promise<void> {
    try {
      logger.info('Sending document expiry notification', { workerId, documentId, expiryDate });
      await this.sendNotification(workerId, 'DOCUMENT_EXPIRY', { documentId, expiryDate });
    } catch (error) {
      logger.error('Error sending document expiry notification:', { error, workerId, documentId });
      throw error;
    }
  }

  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification payload' })
  async send(notification: NotificationPayload): Promise<void> {
    // Implementation
  }
}