import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationStatus, IApplication, IJob } from '../interfaces/models.interface';
import { NotificationService } from './notification.service';
import { RedisService } from './redis.service';
import { DocumentService } from './document.service';
import { AppError } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';
import { ApplicationStatusDto } from '../dtos/application-status.dto';
import { PaginationParamsDto } from '../dtos/pagination-params.dto';
import { CreateApplicationDto } from '../dtos/application.dto';
import { NotificationType } from '../types/notification.types';
import { ApplicationStatus as ApplicationStatusEnum } from '../types/application.types';

const logger = new Logger('ApplicationService');

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>,
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    private readonly notificationService: NotificationService,
    private readonly redisService: RedisService,
    private readonly documentService: DocumentService
  ) {}

  async apply(jobId: string, workerId: string, applicationData: Partial<IApplication>): Promise<IApplication> {
    try {
      // Check if job exists and is open
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new AppError(404, 'Job not found');
      }
      if (job.status !== 'OPEN') {
        throw new AppError(400, 'This job is no longer accepting applications');
      }

      // Check if worker has already applied
      const existingApplication = await this.applicationModel.findOne({
        jobId,
        workerId
      });
      if (existingApplication) {
        throw new AppError(400, 'You have already applied for this job');
      }

      // Check document compliance
      const isCompliant = await this.documentService.verifyDocuments(workerId);
      if (!isCompliant) {
        throw new AppError(400, 'Missing required documents for application');
      }

      // Create application
      const application = await this.applicationModel.create({
        jobId,
        workerId,
        ...applicationData,
        timeline: [{
          action: 'Application submitted',
          status: 'pending',
          timestamp: new Date()
        }],
        clientId: job.clientId,
        status: 'pending',
        appliedDate: new Date()
      });

      // Update job metadata
      await this.jobModel.findByIdAndUpdate(jobId, {
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
      await this.redisService.clearCache(`matching:workers:${jobId}`);

      // Notify client about new application
      await this.notificationService.send({
        userId: job.clientId.toString(),
        type: NotificationType.APPLICATION_UPDATE,
        title: 'New Application Received',
        body: `A new application has been received for job ${job.title}`,
        data: { 
          application,
          job: application.jobId,
          status: application.status
        }
      });

      return application;
    } catch (error) {
      logger.error('Error creating application:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: ApplicationStatusDto): Promise<IApplication> {
    try {
      const application = await this.applicationModel.findById(id);
      if (!application) {
        throw new AppError(404, 'Application not found');
      }

      application.status = status.status;
      application.timeline.push({
        action: 'Status updated',
        status: status.status,
        note: status.notes,
        timestamp: new Date()
      });

      await application.save();

      // Update job applicant status
      await this.jobModel.updateOne(
        { 
          _id: application.jobId,
          'applicants.workerId': application.workerId
        },
        {
          $set: { 'applicants.$.status': status.status }
        }
      );

      // Notify worker about application status update
      await this.notificationService.send({
        userId: application.workerId.toString(),
        type: NotificationType.APPLICATION_UPDATE,
        title: 'Application Status Updated',
        body: `Your application status has been updated to ${status.status}`,
        data: { 
          application,
          job: application.jobId,
          status: status.status,
          note: status.notes
        }
      });

      return application;
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  async getApplicationsByWorker(workerId: string, status?: ApplicationStatus[]): Promise<IApplication[]> {
    const query: any = { workerId };
    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    return this.applicationModel.find(query)
      .populate('jobId')
      .sort({ createdAt: -1 });
  }

  async getApplicationsByJob(jobId: string, status?: ApplicationStatus[]): Promise<IApplication[]> {
    const query: any = { jobId };
    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    return this.applicationModel.find(query)
      .populate('workerId')
      .sort({ createdAt: -1 });
  }

  async create(dto: CreateApplicationDto): Promise<IApplication> {
    try {
      const application = await this.applicationModel.create(dto);
      await this.notificationService.sendApplicationNotification(application);
      return application;
    } catch (error) {
      logger.error('Error creating application:', error);
      throw error;
    }
  }

  async findAll(query: PaginationParamsDto): Promise<IApplication[]> {
    try {
      const { page = 1, limit = 10 } = query;
      return this.applicationModel
        .find()
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
    } catch (error) {
      logger.error('Error finding applications:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<IApplication> {
    try {
      const application = await this.applicationModel.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }
      return application;
    } catch (error) {
      logger.error('Error finding application:', error);
      throw error;
    }
  }

  async withdraw(id: string): Promise<IApplication> {
    try {
      const application = await this.applicationModel.findByIdAndUpdate(
        id,
        { status: 'withdrawn' },
        { new: true }
      );
      if (!application) {
        throw new Error('Application not found');
      }
      await this.notificationService.sendWithdrawalNotification(application);
      return application;
    } catch (error) {
      logger.error('Error withdrawing application:', error);
      throw error;
    }
  }

  async getWorkerApplications(workerId: string, query: PaginationParamsDto): Promise<IApplication[]> {
    try {
      const { page = 1, limit = 10 } = query;
      
      return this.applicationModel
        .find({ workerId })
        .populate('jobId')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      logger.error('Error getting worker applications:', error);
      throw error;
    }
  }

  async getJobApplications(jobId: string, query: PaginationParamsDto): Promise<IApplication[]> {
    try {
      const { page = 1, limit = 10 } = query;
      
      return this.applicationModel
        .find({ jobId })
        .populate('workerId')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      logger.error('Error getting job applications:', error);
      throw error;
    }
  }
} 