import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { SearchService } from '../../services/search.service';
import { AnalyticsService } from '../../services/analytics.service';

@Injectable()
export class JobPostingManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_ACTIVE_JOBS = 100;
  private readonly EXPIRY_NOTIFICATION_DAYS = 7;
  private readonly JOB_STATUS = [
    'draft',
    'published',
    'expired',
    'filled',
    'cancelled'
  ] as const;

  constructor(
    @InjectModel('Job') private jobModel: Model<any>,
    @InjectModel('Application') private applicationModel: Model<any>,
    @InjectModel('Metrics') private metricsModel: Model<any>,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private searchService: SearchService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createJobPosting(
    input: JobPostingInput
  ): Promise<JobPostingResponse> {
    try {
      // Validate job posting data
      await this.validateJobPosting(input);

      // Check active jobs limit
      await this.checkActiveJobsLimit();

      // Create job posting
      const job = await this.jobModel.create({
        ...input,
        status: 'draft',
        createdAt: new Date()
      });

      // Index for search
      await this.indexJobPosting(job);

      // Initialize metrics tracking
      await this.initializeJobMetrics(job);

      return {
        success: true,
        jobId: job._id,
        message: 'Job posting created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating job posting:', error);
      throw error;
    }
  }

  async publishJobPosting(
    jobId: string
  ): Promise<PublishResponse> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error('Job posting not found');
      }

      // Validate job is ready for publishing
      await this.validateForPublishing(job);

      // Update status
      job.status = 'published';
      job.publishedAt = new Date();
      await job.save();

      // Update search index
      await this.updateSearchIndex(job);

      // Set up expiry notification
      await this.scheduleExpiryNotification(job);

      // Track publishing event
      await this.trackPublishingEvent(job);

      return {
        success: true,
        jobId,
        message: 'Job posting published successfully'
      };
    } catch (error) {
      this.logger.error('Error publishing job posting:', error);
      throw error;
    }
  }

  async updateJobPosting(
    jobId: string,
    input: UpdateInput
  ): Promise<UpdateResponse> {
    try {
      // Validate update data
      await this.validateUpdateData(input);

      // Update job posting
      const job = await this.jobModel.findByIdAndUpdate(
        jobId,
        {
          ...input,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!job) {
        throw new Error('Job posting not found');
      }

      // Update search index
      await this.updateSearchIndex(job);

      // Track update event
      await this.trackUpdateEvent(job);

      return {
        success: true,
        jobId,
        message: 'Job posting updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating job posting:', error);
      throw error;
    }
  }

  async getJobMetrics(
    jobId: string
  ): Promise<JobMetrics> {
    const cacheKey = `job:metrics:${jobId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const metrics = await this.calculateJobMetrics(jobId);
      await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

      return metrics;
    } catch (error) {
      this.logger.error('Error getting job metrics:', error);
      throw error;
    }
  }

  private async calculateJobMetrics(
    jobId: string
  ): Promise<JobMetrics> {
    const [job, applications, analytics] = await Promise.all([
      this.jobModel.findById(jobId),
      this.applicationModel.find({ jobId }),
      this.analyticsService.getJobAnalytics(jobId)
    ]);

    if (!job) {
      throw new Error('Job posting not found');
    }

    return {
      views: {
        total: analytics.views,
        unique: analytics.uniqueViews,
        bySource: analytics.viewsBySource
      },
      applications: {
        total: applications.length,
        status: this.groupApplicationsByStatus(applications),
        conversionRate: this.calculateConversionRate(
          analytics.views,
          applications.length
        )
      },
      engagement: {
        averageTimeOnPage: analytics.averageTimeOnPage,
        clickThroughRate: analytics.clickThroughRate,
        saveRate: analytics.saveRate
      },
      demographics: {
        locations: analytics.locations,
        devices: analytics.devices,
        referrers: analytics.referrers
      }
    };
  }

  private async indexJobPosting(
    job: any
  ): Promise<void> {
    const searchDocument = {
      id: job._id,
      title: job.title,
      description: job.description,
      skills: job.requirements.skills,
      location: job.location,
      type: job.type,
      salary: job.salary,
      company: job.company,
      department: job.department,
      status: job.status
    };

    await this.searchService.indexDocument('jobs', searchDocument);
  }

  private async validateForPublishing(
    job: any
  ): Promise<void> {
    const requiredFields = [
      'title',
      'description',
      'requirements',
      'location',
      'type',
      'salary'
    ];

    for (const field of requiredFields) {
      if (!job[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Additional validation logic
    if (job.status !== 'draft') {
      throw new Error('Only draft jobs can be published');
    }

    if (job.expiryDate && new Date(job.expiryDate) <= new Date()) {
      throw new Error('Expiry date must be in the future');
    }
  }
}

interface JobPostingInput {
  title: string;
  description: string;
  company: string;
  department: string;
  location: {
    type: string;
    address?: string;
    remote?: boolean;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'temporary';
  salary: {
    min: number;
    max: number;
    currency: string;
    period: 'hour' | 'day' | 'month' | 'year';
  };
  requirements: {
    skills: string[];
    experience: string;
    education: string;
    certifications?: string[];
  };
  benefits?: string[];
  expiryDate?: Date;
  metadata?: Record<string, any>;
}

interface JobPostingResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface PublishResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface UpdateInput {
  title?: string;
  description?: string;
  requirements?: {
    skills?: string[];
    experience?: string;
    education?: string;
    certifications?: string[];
  };
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hour' | 'day' | 'month' | 'year';
  };
  status?: typeof JobPostingManager.prototype.JOB_STATUS[number];
  expiryDate?: Date;
  metadata?: Record<string, any>;
}

interface UpdateResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface JobMetrics {
  views: {
    total: number;
    unique: number;
    bySource: Record<string, number>;
  };
  applications: {
    total: number;
    status: Record<string, number>;
    conversionRate: number;
  };
  engagement: {
    averageTimeOnPage: number;
    clickThroughRate: number;
    saveRate: number;
  };
  demographics: {
    locations: Record<string, number>;
    devices: Record<string, number>;
    referrers: Record<string, number>;
  };
} 