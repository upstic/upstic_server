import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async sendNotification(
    @CurrentUser() user: JwtPayload,
    @Body() notificationData: { type: string; data: any }
  ) {
    await this.notificationService.sendNotification(
      user.sub,
      notificationData.type,
      notificationData.data
    );
    return { message: 'Notification sent successfully' };
  }

  @Post('job-match/:jobId')
  async sendJobMatchNotification(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string
  ) {
    await this.notificationService.sendJobMatchNotification(user.sub, jobId);
    return { message: 'Job match notification sent successfully' };
  }

  @Post('application-status/:jobId')
  async sendApplicationStatusNotification(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Body() data: { status: string }
  ) {
    await this.notificationService.sendApplicationStatusNotification(
      user.sub,
      jobId,
      data.status
    );
    return { message: 'Application status notification sent successfully' };
  }

  @Post('document-expiry/:documentId')
  async sendDocumentExpiryNotification(
    @CurrentUser() user: JwtPayload,
    @Param('documentId') documentId: string,
    @Body() data: { expiryDate: Date }
  ) {
    await this.notificationService.sendDocumentExpiryNotification(
      user.sub,
      documentId,
      data.expiryDate
    );
    return { message: 'Document expiry notification sent successfully' };
  }

  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload
  ) {
    const notifications = await this.notificationService.getNotifications(user.sub);
    return { success: true, data: notifications };
  }

  @Get(':notificationId')
  async getNotification(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string
  ) {
    const notification = await this.notificationService.getNotification(notificationId, user.sub);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return { success: true, data: notification };
  }

  @Put(':notificationId/mark-as-read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string
  ) {
    const notification = await this.notificationService.markAsRead(notificationId, user.sub);
    return { success: true, data: notification };
  }

  @Put('mark-all-as-read')
  async markAllAsRead(
    @CurrentUser() user: JwtPayload
  ) {
    await this.notificationService.markAllAsRead(user.sub);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() preferences: any
  ) {
    const updatedPreferences = await this.notificationService.updatePreferences(user.sub, preferences);
    return { success: true, data: updatedPreferences };
  }

  @Get('preferences')
  async getPreferences(
    @CurrentUser() user: JwtPayload
  ) {
    const preferences = await this.notificationService.getPreferences(user.sub);
    return { success: true, data: preferences };
  }

  @Delete(':notificationId')
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string
  ) {
    await this.notificationService.deleteNotification(notificationId, user.sub);
    return { success: true };
  }

  @Get('statistics')
  async getNotificationStatistics(
    @CurrentUser() user: JwtPayload,
    @Body() filters: any
  ) {
    const statistics = await this.notificationService.getNotificationStatistics(filters);
    return { success: true, data: statistics };
  }

  @Post('bulk')
  async sendBulkNotifications(
    @CurrentUser() user: JwtPayload,
    @Body() notificationData: any
  ) {
    const result = await this.notificationService.sendBulkNotifications(user.sub, notificationData);
    return { success: true, data: result };
  }
}