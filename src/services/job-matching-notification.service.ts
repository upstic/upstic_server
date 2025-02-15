import { AIMatchingService } from './ai-matching.service';
import { notificationService, NotificationType } from './notification.service';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { redisService } from './redis.service';
import { Queue, Worker } from 'bullmq';
import { config } from '../config';

export class JobMatchingNotificationService {
  private static matchingQueue: Queue;
  
  static initialize() {
    this.matchingQueue = new Queue('job-matching', {
      connection: config.redis.connection
    });

    // Process job matches every hour
    new Worker('job-matching', async (job) => {
      await this.processJobMatches();
    }, {
      connection: config.redis.connection
    });

    // Schedule job matching every hour
    this.scheduleMatchingJob();
  }

  private static async scheduleMatchingJob() {
    await this.matchingQueue.add('process-matches', {}, {
      repeat: {
        pattern: '0 * * * *' // Every hour
      }
    });
  }

  private static async processJobMatches() {
    try {
      // Get all active workers
      const workers = await User.find({ 
        role: 'WORKER',
        isActive: true,
        notificationPreferences: { $exists: true }
      });

      // Get all open jobs
      const openJobs = await Job.find({ status: 'OPEN' });

      for (const worker of workers) {
        const cacheKey = `last-matches:${worker._id}`;
        const lastMatches = await redisService.get(cacheKey) || [];

        // Find new matches for worker
        const currentMatches = await AIMatchingService.findMatchingJobs(worker._id);
        
        // Filter out jobs that were already notified
        const newMatches = currentMatches.filter(
          match => !lastMatches.includes(match._id.toString())
        );

        if (newMatches.length > 0) {
          // Send notification for new matches
          await this.notifyWorkerOfMatches(worker._id, newMatches);
          
          // Update cache with current matches
          await redisService.set(
            cacheKey,
            currentMatches.map(match => match._id.toString()),
            86400 // 24 hours
          );
        }
      }
    } catch (error) {
      console.error('Error processing job matches:', error);
    }
  }

  private static async notifyWorkerOfMatches(workerId: string, matches: any[]) {
    // Send push notification
    await notificationService.queueNotification({
      userId: workerId,
      type: NotificationType.JOB_MATCH,
      data: {
        matches: matches.map(match => ({
          id: match._id,
          title: match.title,
          company: match.company,
          location: match.location,
          hourlyRate: match.hourlyRate
        }))
      }
    });

    // Send email notification
    await notificationService.queueNotification({
      userId: workerId,
      type: NotificationType.EMAIL,
      data: {
        template: 'job-matches',
        subject: 'New Job Matches Found',
        data: {
          matches: matches.slice(0, 5) // Send top 5 matches
        }
      }
    });
  }

  // Manual trigger for testing or immediate updates
  static async triggerMatchingProcess() {
    await this.processJobMatches();
  }
}

// Initialize the service
JobMatchingNotificationService.initialize(); 