import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import * as os from 'os';
import { CrashLogDocument } from '../models/crash-log.model';
import { NotificationService } from './notification.service';
import { ICrashLog } from '../interfaces/crash-log.interface';

@Injectable()
export class CrashLogService {
  constructor(
    @InjectModel('CrashLog') private crashLogModel: Model<CrashLogDocument>,
    private notificationService: NotificationService,
  ) {}

  async logCrash(error: Error, req: any, severity: 'critical' | 'error' | 'warning' | 'info' = 'error'): Promise<CrashLogDocument> {
    const systemState = {
      memoryUsage: process.memoryUsage(),
      cpuLoad: os.loadavg()[0],
      processUptime: process.uptime(),
    };

    const crashLog = new this.crashLogModel({
      error: {
        message: error.message,
        stack: error.stack,
        type: error.name,
      },
      systemState,
      userContext: {
        userId: req.user?.id,
        sessionId: req.sessionID,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
      environment: {
        os: os.platform(),
        browser: this.getBrowserInfo(req.headers['user-agent']),
        appVersion: process.env.npm_package_version,
        nodeVersion: process.version,
        timestamp: new Date(),
      },
      severity,
      metadata: {
        route: req.path,
        method: req.method,
        requestBody: req.body,
        requestHeaders: req.headers,
      },
    });

    const savedLog = await crashLog.save();

    // Notify relevant parties for critical errors
    if (severity === 'critical') {
      await this.notifyAdmins(savedLog);
    }

    return savedLog;
  }

  async getCrashLogs(
    filter: {
      severity?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    } = {},
  ): Promise<CrashLogDocument[]> {
    const query: any = {};

    if (filter.severity) {
      query.severity = filter.severity;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.userId) {
      query['userContext.userId'] = new Types.ObjectId(filter.userId);
    }

    if (filter.startDate || filter.endDate) {
      query['environment.timestamp'] = {};
      if (filter.startDate) {
        query['environment.timestamp'].$gte = filter.startDate;
      }
      if (filter.endDate) {
        query['environment.timestamp'].$lte = filter.endDate;
      }
    }

    return this.crashLogModel
      .find(query)
      .sort({ 'environment.timestamp': -1 })
      .exec();
  }

  async getAnalytics(startDate: Date, endDate: Date) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          'environment.timestamp': {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            severity: '$severity',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$environment.timestamp' } },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.date': 1,
          '_id.severity': 1,
        } as any,
      },
    ];

    return this.crashLogModel.aggregate(pipeline);
  }

  async resolveCrashLog(
    crashLogId: string,
    userId: string,
    resolution: { notes: string; solution: string },
  ): Promise<CrashLogDocument> {
    const crashLog = await this.crashLogModel.findById(crashLogId);
    if (!crashLog) {
      throw new Error('Crash log not found');
    }

    // Use type assertion to access ICrashLog properties
    const crashLogDoc = crashLog as unknown as ICrashLog & Document;
    
    crashLogDoc.status = 'resolved';
    crashLogDoc.resolution = {
      resolvedBy: userId,
      resolvedAt: new Date(),
      notes: resolution.notes,
      solution: resolution.solution
    };
    
    return crashLog.save();
  }

  private async notifyAdmins(crashLog: any): Promise<void> {
    const message = {
      title: `Critical Error: ${crashLog.error.type}`,
      body: `
        Error Message: ${crashLog.error.message}
        Route: ${crashLog.metadata.route}
        Time: ${crashLog.environment.timestamp}
        Environment: ${crashLog.environment.os} - Node ${crashLog.environment.nodeVersion}
      `,
      type: 'CRITICAL_ERROR',
      metadata: {
        crashLogId: crashLog._id,
      },
    };

    // Send notification to admin users
    try {
      // If notifyAdmins doesn't exist, use a generic notification method
      if (typeof this.notificationService.notifyAdmins === 'function') {
        await this.notificationService.notifyAdmins(message);
      } else if (typeof this.notificationService.sendNotificationToRecipients === 'function') {
        await this.notificationService.sendNotificationToRecipients({
          ...message,
          recipients: ['admin'],
        });
      } else {
        console.warn('No suitable notification method found for admin alerts');
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  }

  private getBrowserInfo(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    
    // Simple browser detection - can be enhanced with a proper user-agent parser library
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    
    return 'Other';
  }
} 