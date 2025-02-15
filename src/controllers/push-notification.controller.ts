import { Request, Response, NextFunction } from 'express';
import { pushNotificationService } from '../services/push-notification.service';
import { AppError } from '../middleware/errorHandler';

export class PushNotificationController {
  static async registerToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const userId = req.user!.userId;

      await pushNotificationService.registerPushToken(userId, token);

      res.json({
        status: 'success',
        message: 'Push token registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async unregisterToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await pushNotificationService.unregisterPushToken(userId);

      res.json({
        status: 'success',
        message: 'Push token unregistered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNotificationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const history = await pushNotificationService.getNotificationHistory(userId);

      res.json({
        status: 'success',
        data: { notifications: history }
      });
    } catch (error) {
      next(error);
    }
  }
} 