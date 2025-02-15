import { Application, ApplicationStatus, IApplication } from '../models/Application';
import { Job, JobStatus } from '../models/Job';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService, NotificationType } from './notification.service';
import { redisService } from './redis.service';
import { DocumentService } from './document.service';

export class ApplicationService {
  static async apply(
    jobId: string,
    workerId: string,
    applicationData: Partial<IApplication>
  ): Promise<IApplication> {
    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }
    if (job.status !== JobStatus.OPEN) {
      throw new AppError(400, 'This job is no longer accepting applications');
    }

    // Check if worker has already applied
    const existingApplication = await Application.findOne({
      jobId,
      workerId
    });
    if (existingApplication) {
      throw new AppError(400, 'You have already applied for this job');
    }

    // Check document compliance
    const isCompliant = await DocumentService.checkDocumentCompliance(workerId);
    if (!isCompliant) {
      throw new AppError(400, 'Missing required documents for application');
    }

    // Create application
    const application = new Application({
      jobId,
      workerId,
      ...applicationData,
      timeline: [{
        action: 'Application submitted',
        status: ApplicationStatus.PENDING,
        timestamp: new Date()
      }],
      clientId: job.clientId,
      status: ApplicationStatus.PENDING,
      appliedDate: new Date()
    });

    await application.save();

    // Update job metadata
    await Job.findByIdAndUpdate(jobId, {
      $inc: { 'metadata.applications': 1 },
      $push: { 
        applicants: {
          workerId,
          status: 'pending',
          appliedAt: new Date()
        }
      }
    });

    // Clear cache for job matches
    await redisService.delete(`matching:workers:${jobId}`);

    // Notify client about new application
    await notificationService.queueNotification({
      userId: job.clientId.toString(),
      type: NotificationType.APPLICATION_UPDATE,
      data: { application, job }
    });

    return application;
  }

  static async updateStatus(
    applicationId: string,
    status: ApplicationStatus,
    note?: string
  ): Promise<IApplication> {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    application.status = status;
    application.timeline.push({
      action: 'Status updated',
      status,
      note,
      timestamp: new Date()
    });

    await application.save();

    // Update job applicant status
    await Job.updateOne(
      { 
        _id: application.jobId,
        'applicants.workerId': application.workerId
      },
      {
        $set: { 'applicants.$.status': status }
      }
    );

    // Notify worker about application status update
    await notificationService.queueNotification({
      userId: application.workerId.toString(),
      type: NotificationType.APPLICATION_UPDATE,
      data: { 
        application,
        job: application.jobId,
        status,
        note 
      }
    });

    return application;
  }

  static async getApplicationsByWorker(
    workerId: string,
    status?: ApplicationStatus[]
  ): Promise<IApplication[]> {
    const query: any = { workerId };
    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    return Application.find(query)
      .populate('jobId')
      .sort({ createdAt: -1 });
  }

  static async getApplicationsByJob(
    jobId: string,
    status?: ApplicationStatus[]
  ): Promise<IApplication[]> {
    const query: any = { jobId };
    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    return Application.find(query)
      .populate('workerId')
      .sort({ createdAt: -1 });
  }
} 