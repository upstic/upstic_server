import { Application, ApplicationStatus, IApplication } from '../models/Application';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService, NotificationType } from './notification.service';
import { AIMatchingService } from './ai-matching.service';

export class ATSService {
  static async createApplication(
    workerId: string,
    jobId: string,
    initialNotes?: string
  ): Promise<IApplication> {
    // Check if application already exists
    const existingApplication = await Application.findOne({ workerId, jobId });
    if (existingApplication) {
      throw new AppError(400, 'Application already exists');
    }

    // Verify job and worker exist
    const [job, worker] = await Promise.all([
      Job.findById(jobId),
      User.findById(workerId)
    ]);

    if (!job || !worker) {
      throw new AppError(404, 'Job or Worker not found');
    }

    // Calculate match percentage using AI service
    const matchPercentage = await AIMatchingService.calculateMatchScore(worker, job);

    const application = new Application({
      workerId,
      jobId,
      status: ApplicationStatus.NEW,
      currentStage: ApplicationStatus.NEW,
      matchPercentage,
      stageHistory: [{
        status: ApplicationStatus.NEW,
        date: new Date(),
        updatedBy: workerId,
        notes: initialNotes
      }]
    });

    await application.save();

    // Notify recruiter of new application
    await notificationService.queueNotification({
      userId: job.recruiterId,
      type: NotificationType.NEW_APPLICATION,
      data: { application, job, worker }
    });

    return application;
  }

  static async updateApplicationStage(
    applicationId: string,
    newStatus: ApplicationStatus,
    recruiterId: string,
    notes?: string,
    documents?: Array<{ name: string; url: string; type: string; }>
  ): Promise<IApplication> {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    application.status = newStatus;
    application.currentStage = newStatus;
    application.lastUpdated = new Date();

    application.stageHistory.push({
      status: newStatus,
      date: new Date(),
      notes,
      updatedBy: recruiterId,
      documents
    });

    await application.save();

    // Notify worker of status change
    await notificationService.queueNotification({
      userId: application.workerId,
      type: NotificationType.APPLICATION_UPDATE,
      data: { application, status: newStatus, notes }
    });

    return application;
  }

  static async getApplicationsByJob(
    jobId: string,
    filters?: {
      status?: ApplicationStatus[];
      sortBy?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ applications: IApplication[]; total: number }> {
    const query: any = { jobId };
    if (filters?.status?.length) {
      query.status = { $in: filters.status };
    }

    const total = await Application.countDocuments(query);
    const applications = await Application.find(query)
      .sort(filters?.sortBy ? { [filters.sortBy]: -1 } : { appliedDate: -1 })
      .skip(filters?.page ? (filters.page - 1) * (filters.limit || 10) : 0)
      .limit(filters?.limit || 10)
      .populate('workerId', 'firstName lastName email phone')
      .exec();

    return { applications, total };
  }

  static async addRecruiterNote(
    applicationId: string,
    recruiterId: string,
    note: string
  ): Promise<IApplication> {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    application.recruiterNotes.push(note);
    application.lastUpdated = new Date();
    await application.save();

    return application;
  }
} 