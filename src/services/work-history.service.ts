import { WorkHistory, EmploymentType, CompletionStatus, IWorkHistory } from '../models/WorkHistory';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Client } from '../models/Client';
import { Timesheet } from '../models/Timesheet';
import { AppError } from '../middleware/errorHandler';
import { uploadToS3 } from '../utils/s3';
import { notificationService } from './notification.service';
import { calculateAverageRating } from '../utils/rating-calculator';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';

export class WorkHistoryService {
  private static readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  static async createWorkHistory(
    workerId: string,
    jobId: string,
    data: Partial<IWorkHistory>
  ): Promise<IWorkHistory> {
    const [worker, job] = await Promise.all([
      User.findById(workerId),
      Job.findById(jobId)
    ]);

    if (!worker || !job) {
      throw new AppError(404, 'Worker or Job not found');
    }

    // Check for existing active work history
    const existingHistory = await WorkHistory.findOne({
      workerId,
      jobId,
      status: CompletionStatus.ONGOING
    });

    if (existingHistory) {
      throw new AppError(400, 'Active work history already exists for this job');
    }

    const workHistory = new WorkHistory({
      ...data,
      workerId,
      jobId,
      clientId: job.clientId,
      startDate: new Date(),
      status: CompletionStatus.ONGOING,
      metrics: {
        overtimeHours: 0,
        sickDays: 0,
        lateDays: 0,
        completedShifts: 0,
        missedShifts: 0,
        averageHoursPerWeek: 0
      }
    });

    await workHistory.save();
    return workHistory;
  }

  static async updatePerformance(
    workHistoryId: string,
    reviewerId: string,
    performanceData: {
      rating: number;
      attendance: number;
      reliability: number;
      qualityOfWork: number;
      teamwork: number;
      punctuality: number;
      review?: {
        rating: number;
        comment: string;
      };
    }
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    // Update performance metrics
    workHistory.performance = {
      ...workHistory.performance,
      ...performanceData
    };

    // Add review if provided
    if (performanceData.review) {
      workHistory.performance.reviews.push({
        reviewerId,
        ...performanceData.review,
        date: new Date()
      });
    }

    // Recalculate overall rating
    workHistory.performance.rating = calculateAverageRating([
      performanceData.attendance,
      performanceData.reliability,
      performanceData.qualityOfWork,
      performanceData.teamwork,
      performanceData.punctuality
    ]);

    await workHistory.save();

    // Notify worker of performance update
    await notificationService.send({
      userId: workHistory.workerId,
      title: 'Performance Update',
      body: 'Your performance review has been updated',
      type: 'PERFORMANCE_UPDATE'
    });

    return workHistory;
  }

  static async addSkill(
    workHistoryId: string,
    skill: {
      name: string;
      level: number;
    },
    endorserId?: string
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    const newSkill = {
      ...skill,
      endorsed: !!endorserId,
      endorsedBy: endorserId
    };

    workHistory.skills = workHistory.skills || [];
    workHistory.skills.push(newSkill);

    await workHistory.save();
    return workHistory;
  }

  static async addAchievement(
    workHistoryId: string,
    achievement: {
      title: string;
      description: string;
      date: Date;
    },
    verifierId?: string
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    workHistory.achievements = workHistory.achievements || [];
    workHistory.achievements.push({
      ...achievement,
      verifiedBy: verifierId
    });

    await workHistory.save();
    return workHistory;
  }

  static async recordIncident(
    workHistoryId: string,
    incident: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      resolution?: string;
    },
    reporterId: string
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    workHistory.incidents = workHistory.incidents || [];
    workHistory.incidents.push({
      ...incident,
      date: new Date(),
      reportedBy: reporterId
    });

    await workHistory.save();

    // Notify relevant parties based on severity
    if (incident.severity === 'high') {
      await this.notifyIncident(workHistory, incident);
    }

    return workHistory;
  }

  static async addFeedback(
    workHistoryId: string,
    feedback: {
      type: 'client' | 'supervisor' | 'coworker';
      rating: number;
      comment: string;
      category: string;
    },
    fromId: string
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    workHistory.feedback = workHistory.feedback || [];
    workHistory.feedback.push({
      ...feedback,
      fromId,
      date: new Date(),
      comment: sanitizeHtml(feedback.comment)
    });

    await workHistory.save();
    return workHistory;
  }

  static async uploadDocument(
    workHistoryId: string,
    document: {
      type: string;
      name: string;
      expiryDate?: Date;
    },
    file: Express.Multer.File
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    // Validate file
    if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file type');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new AppError(400, 'File size exceeds limit');
    }

    // Upload to S3
    const url = await uploadToS3(
      file,
      `work-history/${workHistoryId}/documents/${Date.now()}-${file.originalname}`
    );

    workHistory.documents = workHistory.documents || [];
    workHistory.documents.push({
      ...document,
      url,
      uploadDate: new Date()
    });

    await workHistory.save();
    return workHistory;
  }

  static async updateMetrics(
    workHistoryId: string,
    updates: Partial<IWorkHistory['metrics']>
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    workHistory.metrics = {
      ...workHistory.metrics,
      ...updates
    };

    await workHistory.save();
    return workHistory;
  }

  static async completeWorkHistory(
    workHistoryId: string,
    status: CompletionStatus,
    endDate: Date
  ): Promise<IWorkHistory> {
    const workHistory = await WorkHistory.findById(workHistoryId);
    if (!workHistory) {
      throw new AppError(404, 'Work history not found');
    }

    workHistory.status = status;
    workHistory.endDate = endDate;

    // Calculate final metrics
    const finalMetrics = await this.calculateFinalMetrics(workHistory);
    workHistory.metrics = {
      ...workHistory.metrics,
      ...finalMetrics
    };

    await workHistory.save();

    // Notify relevant parties
    await this.notifyCompletion(workHistory);

    return workHistory;
  }

  private static async calculateFinalMetrics(
    workHistory: IWorkHistory
  ): Promise<Partial<IWorkHistory['metrics']>> {
    const timesheets = await Timesheet.find({
      workerId: workHistory.workerId,
      jobId: workHistory.jobId
    });

    // Calculate various metrics from timesheets
    const totalWeeks = Math.ceil(
      (workHistory.endDate!.getTime() - workHistory.startDate.getTime()) / 
      (7 * 24 * 60 * 60 * 1000)
    );

    return {
      averageHoursPerWeek: timesheets.reduce(
        (total, ts) => total + ts.totalHours.regular + ts.totalHours.overtime,
        0
      ) / totalWeeks
    };
  }

  private static async notifyIncident(
    workHistory: IWorkHistory,
    incident: any
  ): Promise<void> {
    const client = await Client.findById(workHistory.clientId);
    
    await Promise.all([
      notificationService.send({
        userId: client!.managerId,
        title: 'High Severity Incident Reported',
        body: `A high severity incident has been reported for ${workHistory.position}`,
        type: 'INCIDENT_REPORTED',
        data: { workHistoryId: workHistory._id }
      }),
      notificationService.send({
        userId: workHistory.workerId,
        title: 'Incident Recorded',
        body: 'An incident has been recorded in your work history',
        type: 'INCIDENT_RECORDED'
      })
    ]);
  }

  private static async notifyCompletion(
    workHistory: IWorkHistory
  ): Promise<void> {
    await notificationService.send({
      userId: workHistory.workerId,
      title: 'Work History Updated',
      body: `Your work history for ${workHistory.position} has been completed`,
      type: 'WORK_HISTORY_COMPLETED'
    });
  }
}