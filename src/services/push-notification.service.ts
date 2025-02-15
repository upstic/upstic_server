import { Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from '../models/Device';
import { Notification } from '../models/Notification';
import { Logger } from '../utils/logger';
import { CacheService } from './cache.service';

@Injectable()
export class PushNotificationService {
  private firebaseApp: firebase.app.App;

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private configService: ConfigService,
    private cacheService: CacheService,
    private logger: Logger
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
    
    this.firebaseApp = firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
      projectId: this.configService.get('FIREBASE_PROJECT_ID')
    });
  }

  async sendNotification(
    userId: string,
    notification: NotificationPayload,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    try {
      const devices = await this.getActiveDevices(userId);
      if (!devices.length) {
        return { success: false, error: 'No active devices found' };
      }

      const messages = devices.map(device => ({
        token: device.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data,
        android: {
          priority: options.priority || 'high',
          notification: {
            sound: options.sound || 'default',
            clickAction: options.clickAction
          }
        },
        apns: {
          payload: {
            aps: {
              sound: options.sound || 'default',
              badge: 1
            }
          }
        }
      }));

      const response = await this.firebaseApp.messaging().sendAll(messages);
      
      await this.saveNotification(userId, notification, response);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        results: response.responses
      };
    } catch (error) {
      this.logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendBatchNotifications(
    notifications: BatchNotification[]
  ): Promise<BatchNotificationResult> {
    try {
      const results = await Promise.all(
        notifications.map(notification =>
          this.sendNotification(
            notification.userId,
            notification.payload,
            notification.options
          )
        )
      );

      return {
        totalSent: notifications.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      this.logger.error('Error sending batch notifications:', error);
      throw error;
    }
  }

  private async getActiveDevices(userId: string): Promise<Device[]> {
    const cacheKey = `user_devices:${userId}`;
    const cachedDevices = await this.cacheService.get(cacheKey);

    if (cachedDevices) {
      return JSON.parse(cachedDevices);
    }

    const devices = await this.deviceModel.find({
      userId,
      status: 'active',
      fcmToken: { $exists: true }
    });

    await this.cacheService.set(cacheKey, JSON.stringify(devices), 3600);
    return devices;
  }

  private async saveNotification(
    userId: string,
    notification: NotificationPayload,
    response: firebase.messaging.BatchResponse
  ): Promise<void> {
    await this.notificationModel.create({
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      status: response.successCount > 0 ? 'sent' : 'failed',
      sentAt: new Date(),
      platform: 'push',
      metadata: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      }
    });
  }

  async registerDevice(deviceInfo: DeviceRegistration): Promise<Device> {
    try {
      const existingDevice = await this.deviceModel.findOne({
        userId: deviceInfo.userId,
        deviceId: deviceInfo.deviceId
      });

      if (existingDevice) {
        existingDevice.fcmToken = deviceInfo.fcmToken;
        existingDevice.lastActive = new Date();
        return existingDevice.save();
      }

      return this.deviceModel.create({
        ...deviceInfo,
        status: 'active',
        registeredAt: new Date(),
        lastActive: new Date()
      });
    } catch (error) {
      this.logger.error('Error registering device:', error);
      throw error;
    }
  }

  async unregisterDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const result = await this.deviceModel.updateOne(
        { userId, deviceId },
        { status: 'inactive', unregisteredAt: new Date() }
      );
      
      await this.cacheService.del(`user_devices:${userId}`);
      
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error('Error unregistering device:', error);
      throw error;
    }
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string };
}

interface NotificationOptions {
  priority?: 'high' | 'normal';
  sound?: string;
  clickAction?: string;
  ttl?: number;
}

interface NotificationResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  results?: firebase.messaging.SendResponse[];
  error?: string;
}

interface BatchNotification {
  userId: string;
  payload: NotificationPayload;
  options?: NotificationOptions;
}

interface BatchNotificationResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
}

interface DeviceRegistration {
  userId: string;
  deviceId: string;
  fcmToken: string;
  platform: 'ios' | 'android' | 'web';
  model?: string;
  osVersion?: string;
} 