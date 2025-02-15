import { JobPosting, JobStatus, JobType, IJobPosting } from '../models/JobPosting';
import { Client } from '../models/Client';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { matchingService } from './matching.service';
import { geocodeAddress } from '../utils/geocoding';
import { sanitizeHtml } from '../utils/sanitizer';
import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

export class JobPostingService {
  private static matchingQueue: Queue;
  private static readonly DEFAULT_EXPIRY_DAYS = 30;
  private static readonly MAX_ACTIVE_JOBS_PER_CLIENT = 50;

  static initialize() {
    this.matchingQueue = new Queue('job-matching', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async createJobPosting(
    clientId: string,
    userId: string,
    jobData: Partial<IJobPosting>
  ): Promise<IJobPosting> {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError(404, 'Client not found');
    }

    // Check active jobs limit
    const activeJobsCount = await JobPosting.countDocuments({
      clientId,
      status: { $in: [JobStatus.PUBLISHED, JobStatus.DRAFT] }
    });

    if (activeJobsCount >= this.MAX_ACTIVE_JOBS_PER_CLIENT) {
      throw new AppError(400, 'Maximum active jobs limit reached');
    }

    // Sanitize input
    const sanitizedData = this.sanitizeJobData(jobData);

    // Geocode address if provided
    if (sanitizedData.location?.address) {
      const coordinates = await geocodeAddress(
        sanitizedData.location.address,
        sanitizedData.location.city,
        sanitizedData.location.country
      );
      if (coordinates) {
        sanitizedData.location.coordinates = coordinates;
      }
    }

    const jobPosting = new JobPosting({
      ...sanitizedData,
      clientId,
      status: JobStatus.DRAFT,
      statistics: {
        views: 0,
        applications: 0,
        shortlisted: 0,
        interviews: 0,
        offers: 0,
        filled: false
      },
      metadata: {
        createdBy: userId,
        lastModifiedBy: userId,
        lastModifiedAt: new Date()
      }
    });

    await jobPosting.save();
    return jobPosting;
  }

  static async publishJobPosting(
    jobId: string,
    userId: string
  ): Promise<IJobPosting> {
    const jobPosting = await JobPosting.findById(jobId);
    if (!jobPosting) {
      throw new AppError(404, 'Job posting not found');
    }

    if (jobPosting.status !== JobStatus.DRAFT) {
      throw new AppError(400, 'Only draft jobs can be published');
    }

    // Validate required fields
    this.validateJobPosting(jobPosting);

    // Set expiry date if not set
    if (!jobPosting.metadata.expiresAt) {
      jobPosting.metadata.expiresAt = new Date(
        Date.now() + this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );
    }

    jobPosting.status = JobStatus.PUBLISHED;
    jobPosting.metadata.publishedAt = new Date();
    jobPosting.metadata.lastModifiedBy = userId;
    jobPosting.metadata.lastModifiedAt = new Date();

    await jobPosting.save();

    // Queue job matching process
    await this.queueJobMatching(jobPosting);

    // Notify relevant candidates
    await this.notifyMatchingCandidates(jobPosting);

    return jobPosting;
  }

  static async updateJobPosting(
    jobId: string,
    userId: string,
    updates: Partial<IJobPosting>
  ): Promise<IJobPosting> {
    const jobPosting = await JobPosting.findById(jobId);
    if (!jobPosting) {
      throw new AppError(404, 'Job posting not found');
    }

    if (jobPosting.status === JobStatus.FILLED || jobPosting.status === JobStatus.CANCELLED) {
      throw new AppError(400, 'Cannot update filled or cancelled jobs');
    }

    // Sanitize updates
    const sanitizedUpdates = this.sanitizeJobData(updates);

    // Update geocoding if address changed
    if (sanitizedUpdates.location?.address) {
      const coordinates = await geocodeAddress(
        sanitizedUpdates.location.address,
        sanitizedUpdates.location.city,
        sanitizedUpdates.location.country
      );
      if (coordinates) {
        sanitizedUpdates.location.coordinates = coordinates;
      }
    }

    Object.assign(jobPosting, sanitizedUpdates);
    jobPosting.metadata.lastModifiedBy = userId;
    jobPosting.metadata.lastModifiedAt = new Date();

    await jobPosting.save();

    // Requeue job matching if published
    if (jobPosting.status === JobStatus.PUBLISHED) {
      await this.queueJobMatching(jobPosting);
    }

    return jobPosting;
  }

  static async closeJobPosting(
    jobId: string,
    userId: string,
    reason: 'filled' | 'cancelled',
    filledByUserId?: string
  ): Promise<IJobPosting> {
    const jobPosting = await JobPosting.findById(jobId);
    if (!jobPosting) {
      throw new AppError(404, 'Job posting not found');
    }

    jobPosting.status = reason === 'filled' ? JobStatus.FILLED : JobStatus.CANCELLED;
    jobPosting.metadata.lastModifiedBy = userId;
    jobPosting.metadata.lastModifiedAt = new Date();

    if (reason === 'filled') {
      jobPosting.statistics.filled = true;
      jobPosting.metadata.filledAt = new Date();
      jobPosting.metadata.filledBy = filledByUserId;
      jobPosting.statistics.timeToFill = 
        jobPosting.metadata.filledAt.getTime() - 
        jobPosting.metadata.publishedAt!.getTime();
    }

    await jobPosting.save();

    // Notify relevant parties
    await this.notifyJobClosure(jobPosting, reason);

    return jobPosting;
  }

  static async searchJobPostings(
    criteria: {
      keywords?: string;
      location?: string;
      jobType?: JobType[];
      skills?: string[];
      experienceLevel?: string;
      salary?: {
        min?: number;
        max?: number;
        currency?: string;
      };
      remote?: boolean;
    },
    options: {
      page?: number;
      limit?: number;
      sort?: string;
    } = {}
  ): Promise<{ jobs: IJobPosting[]; total: number }> {
    const query: any = {
      status: JobStatus.PUBLISHED,
      'metadata.expiresAt': { $gt: new Date() }
    };

    if (criteria.keywords) {
      query.$text = { $search: criteria.keywords };
    }

    if (criteria.location) {
      query['location.city'] = new RegExp(criteria.location, 'i');
    }

    if (criteria.jobType?.length) {
      query.type = { $in: criteria.jobType };
    }

    if (criteria.skills?.length) {
      query['requirements.skills.name'] = { $all: criteria.skills };
    }

    if (criteria.experienceLevel) {
      query['requirements.experience.level'] = criteria.experienceLevel;
    }

    if (criteria.salary) {
      if (criteria.salary.min) {
        query['compensation.min'] = { $gte: criteria.salary.min };
      }
      if (criteria.salary.max) {
        query['compensation.max'] = { $lte: criteria.salary.max };
      }
      if (criteria.salary.currency) {
        query['compensation.currency'] = criteria.salary.currency;
      }
    }

    if (criteria.remote !== undefined) {
      query['location.remote'] = criteria.remote;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      JobPosting.find(query)
        .sort(options.sort || '-metadata.publishedAt')
        .skip(skip)
        .limit(limit),
      JobPosting.countDocuments(query)
    ]);

    return { jobs, total };
  }

  private static sanitizeJobData(data: Partial<IJobPosting>): Partial<IJobPosting> {
    if (data.description) {
      data.description = sanitizeHtml(data.description);
    }

    if (data.requirements?.qualifications) {
      data.requirements.qualifications = data.requirements.qualifications.map(
        qual => sanitizeHtml(qual)
      );
    }

    return data;
  }

  private static validateJobPosting(job: IJobPosting): void {
    const requiredFields = [
      'title',
      'description',
      'type',
      'requirements',
      'location',
      'schedule',
      'compensation'
    ];

    const missingFields = requiredFields.filter(field => !job[field]);
    if (missingFields.length) {
      throw new AppError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  private static async queueJobMatching(job: IJobPosting): Promise<void> {
    await this.matchingQueue.add('match-candidates', {
      jobId: job._id,
      requirements: job.requirements,
      location: job.location
    });
  }

  private static async notifyMatchingCandidates(job: IJobPosting): Promise<void> {
    const matchingCandidates = await matchingService.findMatchingCandidates(job);

    await Promise.all(
      matchingCandidates.map(candidate =>
        notificationService.send({
          userId: candidate._id,
          title: 'New Job Match',
          body: `New job posting matches your profile: ${job.title}`,
          type: 'JOB_MATCH',
          data: { jobId: job._id }
        })
      )
    );
  }

  private static async notifyJobClosure(
    job: IJobPosting,
    reason: 'filled' | 'cancelled'
  ): Promise<void> {
    const client = await Client.findById(job.clientId);
    const message = reason === 'filled'
      ? `Job posting "${job.title}" has been filled`
      : `Job posting "${job.title}" has been cancelled`;

    await notificationService.send({
      userId: client!.managerId,
      title: 'Job Posting Update',
      body: message,
      type: 'JOB_CLOSURE'
    });
  }
}

// Initialize the service
JobPostingService.initialize();