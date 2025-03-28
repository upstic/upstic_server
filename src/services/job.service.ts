import { Job, IJob, JobStatus } from '../models/Job';
import { WorkerProfile } from '../models/WorkerProfile';
import { MatchingService } from './matching.service';
import { RedisService } from './redis.service';
import { AppError } from '../middleware/errorHandler';
import { FilterQuery } from 'mongoose';
import { JobApplication } from '../models/JobApplication';
import { logger } from '../utils/logger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IApplication, IWorkerProfile } from '../interfaces/models.interface';
import { PaginationParamsDto, SortingParamsDto, PaginatedResponseDto } from '../dtos/common.dto';
import { JobResponseDto } from '../dtos/job.dto';
import { FilterConditionDto, FilterOperator, FilteringParamsDto } from '../dtos/common.dto';
import { JobSearchParamsDto } from '../dtos/job.dto';

export interface JobSearchParams {
  query?: string;
  location?: {
    coordinates: [number, number];
    maxDistance?: number;
  };
  skills?: string[];
  salary?: {
    min?: number;
    max?: number;
  };
  jobType?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class JobService {
  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>,
    @InjectModel('WorkerProfile') private readonly workerProfileModel: Model<IWorkerProfile>,
    private readonly matchingService: MatchingService,
    private readonly redisService: RedisService
  ) {}

  async createJob(userId: string, jobData: Partial<IJob>): Promise<IJob> {
    try {
      const job = new this.jobModel({ ...jobData, createdBy: userId });
      await job.save();
      return job;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  async getJobs(filters: any = {}, page = 1, limit = 10) {
    try {
      const jobs = await this.jobModel.find(filters)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
      const total = await this.jobModel.countDocuments(filters);
      return { jobs, total, page, limit };
    } catch (error) {
      logger.error('Error fetching jobs:', error);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<IJob> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) throw new Error('Job not found');
      return job;
    } catch (error) {
      logger.error('Error fetching job:', error);
      throw error;
    }
  }

  static async updateJob(jobId: string, userId: string, updates: Partial<IJob>) {
    try {
      const job = await Job.findOneAndUpdate(
        { _id: jobId, createdBy: userId },
        updates,
        { new: true }
      );
      if (!job) throw new AppError(404, 'Job not found');
      return job;
    } catch (error) {
      logger.error('Error updating job:', error);
      throw error;
    }
  }

  static async deleteJob(jobId: string, userId: string) {
    try {
      const job = await Job.findOneAndDelete({ _id: jobId, createdBy: userId });
      if (!job) throw new AppError(404, 'Job not found');
      return job;
    } catch (error) {
      logger.error('Error deleting job:', error);
      throw error;
    }
  }

  async applyForJob(jobId: string, userId: string): Promise<IApplication> {
    try {
      const application = new this.applicationModel({
        job: jobId,
        applicant: userId,
        status: 'pending'
      });
      await application.save();
      return application;
    } catch (error) {
      logger.error('Error applying for job:', error);
      throw error;
    }
  }

  async getJobApplications(jobId: string, userId: string): Promise<IApplication[]> {
    try {
      return this.applicationModel.find({ job: jobId })
        .populate('applicant', 'name email')
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      logger.error('Error fetching job applications:', error);
      throw error;
    }
  }

  async updateApplicationStatus(
    jobId: string,
    applicationId: string,
    status: string,
    notes?: string
  ): Promise<IApplication> {
    try {
      const application = await this.applicationModel.findOneAndUpdate(
        { _id: applicationId, job: jobId },
        { status, notes },
        { new: true }
      ).lean();
      if (!application) throw new Error('Application not found');
      return application;
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  async publishJob(jobId: string, clientId: string): Promise<IJob> {
    const job = await this.jobModel.findOne({ _id: jobId, clientId });
    if (!job) {
      throw new Error('Job not found');
    }

    job.status = JobStatus.OPEN;
    await job.save();

    // Find matching workers and notify them
    const matchingWorkers = await this.matchingService.findMatchingWorkers(jobId);
    // Implement notification logic here

    return job;
  }

  async searchJobs(params: JobSearchParams): Promise<{ jobs: IJob[]; total: number }> {
    const {
      query,
      location,
      skills,
      salary,
      jobType,
      page = 1,
      limit = 10
    } = params;

    const cacheKey = `jobs:search:${JSON.stringify(params)}`;
    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const filter: FilterQuery<IJob> = { status: JobStatus.OPEN };

    // Text search
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // Location search
    if (location) {
      filter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates
          },
          $maxDistance: (location.maxDistance || 50) * 1000 // Convert to meters
        }
      };
    }

    // Skills filter
    if (skills && skills.length > 0) {
      filter.skills = { $in: skills };
    }

    // Salary range filter
    if (salary) {
      if (salary.min) filter['salary.min'] = { $gte: salary.min };
      if (salary.max) filter['salary.max'] = { $lte: salary.max };
    }

    // Job type filter
    if (jobType) {
      filter.jobType = jobType;
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel.find(filter)
        .sort({ 'metadata.lastModified': -1 })
        .skip(skip)
        .limit(limit)
        .populate('clientId', 'firstName lastName company'),
      this.jobModel.countDocuments(filter)
    ]);

    const result = { jobs, total };
    await this.redisService.set(cacheKey, result, 300); // Cache for 5 minutes

    return result;
  }

  async getRecommendedJobs(workerId: string): Promise<IJob[]> {
    const workerProfile = await this.workerProfileModel.findOne({ userId: workerId });
    if (!workerProfile) {
      throw new Error('Worker profile not found');
    }

    return this.jobModel.find({
      status: JobStatus.OPEN,
      skills: { $in: workerProfile.personalInfo?.skills || [] },
      'salary.min': { 
        $gte: workerProfile.personalInfo?.salary?.expected || 0 
      },
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: workerProfile.personalInfo?.location?.coordinates || [0, 0]
          },
          $maxDistance: 50000
        }
      }
    })
    .sort({ 'metadata.lastModified': -1 })
    .limit(10)
    .populate('clientId', 'firstName lastName company')
    .lean();
  }

  async incrementJobView(jobId: string): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, {
      $inc: { 'metadata.views': 1 }
    });
  }

  async findAll(
    pagination: PaginationParamsDto,
    sorting: SortingParamsDto,
    filtering: FilteringParamsDto
  ): Promise<PaginatedResponseDto<JobResponseDto>> {
    const { page, limit } = pagination;
    const { sortBy, sortOrder } = sorting;
    const { filters, search, searchFields } = filtering;

    const skip = (page - 1) * limit;
    const sort = { [sortBy || 'createdAt']: sortOrder };

    const [items, total] = await Promise.all([
      this.jobModel
        .find()
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.jobModel.countDocuments()
    ]);

    return {
      items: items.map(job => ({
        id: job._id.toString(),
        title: job.title,
        description: job.description,
        skills: job.skills,
        status: job.status
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  private buildFilterQuery(filters?: FilterConditionDto[]) {
    const query: any = {};

    filters?.forEach(filter => {
      const { field, operator, value } = filter;

      switch (operator) {
        case FilterOperator.EQ:
          query[field] = value;
          break;
        case FilterOperator.NE:
          query[field] = { $ne: value };
          break;
        case FilterOperator.GT:
          query[field] = { $gt: value };
          break;
        case FilterOperator.GTE:
          query[field] = { $gte: value };
          break;
        case FilterOperator.LT:
          query[field] = { $lt: value };
          break;
        case FilterOperator.LTE:
          query[field] = { $lte: value };
          break;
        case FilterOperator.IN:
          query[field] = { $in: value };
          break;
        case FilterOperator.NIN:
          query[field] = { $nin: value };
          break;
        case FilterOperator.LIKE:
          query[field] = { $regex: value, $options: 'i' };
          break;
        case FilterOperator.REGEX:
          query[field] = { $regex: value };
          break;
      }
    });

    return query;
  }

  async create(jobData: any): Promise<IJob> {
    const job = new this.jobModel(jobData);
    return job.save();
  }

  async findOne(id: string): Promise<IJob | null> {
    return this.jobModel.findById(id).lean();
  }

  async update(id: string, jobData: any): Promise<IJob | null> {
    return this.jobModel.findByIdAndUpdate(
      id,
      { $set: jobData },
      { new: true }
    ).lean();
  }

  async getApplications(jobId: string): Promise<IApplication[]> {
    return this.applicationModel.find({ jobId }).populate('workerId').lean();
  }

  async getMatches(jobId: string): Promise<any[]> {
    // Implementation for getting matches
    return [];
  }

  async remove(id: string): Promise<IJob | null> {
    return this.jobModel.findByIdAndDelete(id).lean();
  }

  async findById(id: string): Promise<JobResponseDto> {
    const job = await this.jobModel.findById(id).lean();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return {
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      skills: job.skills,
      status: job.status
    };
  }

  async search(query: JobSearchParamsDto): Promise<IJob[]> {
    try {
      const searchQuery: any = { status: 'active' };

      if (query.query) {
        searchQuery.$or = [
          { title: new RegExp(query.query, 'i') },
          { description: new RegExp(query.query, 'i') }
        ];
      }

      if (query.location) {
        searchQuery.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: query.location.coordinates
            },
            $maxDistance: query.location.maxDistance || 10000
          }
        };
      }

      return await this.jobModel.find(searchQuery);
    } catch (error) {
      logger.error('Error searching jobs:', error);
      throw error;
    }
  }

  async publish(id: string): Promise<IJob> {
    try {
      const job = await this.jobModel.findByIdAndUpdate(
        id,
        {
          $set: {
            status: JobStatus.OPEN,
            publishedAt: new Date()
          }
        },
        { new: true }
      );

      if (!job) {
        throw new Error('Job not found');
      }

      return job;
    } catch (error) {
      logger.error('Error publishing job:', error);
      throw error;
    }
  }
} 