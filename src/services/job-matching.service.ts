import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IJob, IWorker, IAvailability } from '../interfaces/models.interface';
import { DayOfWeek } from '../dtos/availability.dto';
import { RedisService } from './redis.service';
import { MLService } from './ml.service';
import { Logger } from '../utils/logger';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationPriority } from '../types/notification.types';

@Injectable()
export class JobMatchingService {
  private readonly logger = new Logger(JobMatchingService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Availability') private readonly availabilityModel: Model<IAvailability>,
    private readonly redisService: RedisService,
    private readonly mlService: MLService,
    private readonly notificationService: NotificationService
  ) {}

  async findMatchingJobs(workerId: string): Promise<IJob[]> {
    try {
      // Check cache first
      const cacheKey = `job_matches:${workerId}`;
      const cachedMatches = await this.redisService.get(cacheKey);
      if (cachedMatches) {
        return cachedMatches;
      }

      // Get worker availability
      const availability = await this.availabilityModel.findOne({ workerId });
      if (!availability) {
        return [];
      }

      // Get worker profile
      const worker = await this.workerModel.findById(workerId);
      if (!worker) {
        return [];
      }

      // Get all active jobs
      const jobs = await this.jobModel.find({ status: 'active' });

      // Filter jobs based on availability
      const matchingJobs = await this.filterJobsByAvailability(jobs, availability);

      // Calculate similarity scores using ML service
      const scores = await this.calculateMatchScores(worker, matchingJobs);

      // Sort jobs by score
      const rankedJobs = matchingJobs
        .map((job, index) => ({ job, score: scores[index] }))
        .sort((a, b) => b.score - a.score)
        .map(({ job }) => job);

      // Cache results
      await this.redisService.set(cacheKey, rankedJobs, this.CACHE_TTL);

      return rankedJobs;
    } catch (error) {
      this.logger.error('Error finding matching jobs:', error);
      throw error;
    }
  }

  private async filterJobsByAvailability(
    jobs: IJob[],
    availability: IAvailability
  ): Promise<IJob[]> {
    return jobs.filter(job => {
      // Check if job schedule conflicts with worker availability
      return this.checkAvailabilityMatch(job, availability);
    });
  }

  private checkAvailabilityMatch(
    job: IJob,
    availability: IAvailability
  ): boolean {
    // Convert numeric day (0-6) to DayOfWeek enum
    const dayMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const jobDay = dayMap[new Date(job.startDate).getDay()] as DayOfWeek;

    const regularSchedule = availability.regularSchedule.find(
      schedule => schedule.dayOfWeek === jobDay
    );

    if (!regularSchedule?.isAvailable) {
      return false;
    }

    // Check exceptions
    const jobDate = new Date(job.startDate).toDateString();
    const exception = availability.exceptions?.find(
      ex => new Date(ex.date).toDateString() === jobDate
    );

    if (exception && !exception.isAvailable) {
      return false;
    }

    return true;
  }

  private async calculateMatchScores(
    source: IWorker | IJob,
    targets: (IWorker | IJob)[]
  ): Promise<number[]> {
    const sourceFeatures = source instanceof this.workerModel 
      ? this.extractWorkerFeatures(source as IWorker)
      : this.extractJobFeatures(source as IJob);
      
    const targetFeatures = targets.map(target => 
      target instanceof this.workerModel
        ? this.extractWorkerFeatures(target as IWorker)
        : this.extractJobFeatures(target as IJob)
    );

    const sourceEmbeddings = await this.mlService.generateEmbeddings([sourceFeatures]);
    const targetEmbeddings = await this.mlService.generateEmbeddings(targetFeatures);

    const similarities = await this.mlService.calculateSimilarities(
      sourceEmbeddings,
      targetEmbeddings
    );

    return similarities[0];
  }

  private extractWorkerFeatures(worker: IWorker): Record<string, any> {
    return {
      skills: worker.skills,
      experience: worker.experience,
      preferredLocation: worker.preferredLocation,
      expectedSalary: worker.salary?.expected,
      availability: worker.availability,
      languages: worker.languages,
      certifications: worker.documents?.filter(d => d.type === 'certificate').map(d => d.name),
      reliabilityScore: worker.metrics?.reliabilityScore
    };
  }

  private extractJobFeatures(job: IJob): Record<string, any> {
    return {
      skills: job.skills,
      experience: job.experience,
      location: job.location,
      salary: job.salary?.max,
      jobType: job.jobType,
      requiredLanguages: job.languages,
      requiredCertifications: job.requirements?.certifications,
      urgency: job.urgency || 'normal'
    };
  }

  async findMatchingCandidates(jobId: string): Promise<IWorker[]> {
    try {
      // Check cache first
      const cacheKey = `candidate_matches:${jobId}`;
      const cachedMatches = await this.redisService.get(cacheKey);
      if (cachedMatches) {
        return cachedMatches;
      }

      // Get job details
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        return [];
      }

      // Get all workers with matching basic criteria
      const workers = await this.workerModel.find({
        'skills': { $in: job.skills },
        'experience': { $gte: job.experience || 0 }
      });

      // Filter workers based on availability
      const availableWorkers = await this.filterWorkersByAvailability(workers, job);

      // Calculate similarity scores
      const scores = await this.calculateMatchScores(job, availableWorkers);

      // Sort workers by score
      const rankedWorkers = availableWorkers
        .map((worker, index) => ({ worker, score: scores[index] }))
        .sort((a, b) => b.score - a.score)
        .map(({ worker }) => worker);

      // Cache results
      await this.redisService.set(cacheKey, rankedWorkers, this.CACHE_TTL);

      return rankedWorkers;
    } catch (error) {
      this.logger.error('Error finding matching candidates:', error);
      throw error;
    }
  }

  private async filterWorkersByAvailability(
    workers: IWorker[],
    job: IJob
  ): Promise<IWorker[]> {
    const availabilities = await this.availabilityModel.find({
      workerId: { $in: workers.map(w => w._id) }
    });

    return workers.filter(worker => {
      const availability = availabilities.find(a => a.workerId === worker._id.toString());
      return availability ? this.checkAvailabilityMatch(job, availability) : false;
    });
  }

  private async notifyMatch(workerId: string, jobId: string, score: number): Promise<void> {
    await this.notificationService.send({
      userId: workerId,
      type: NotificationType.JOB_MATCH,
      title: 'New Job Match',
      body: 'A new job matching your profile has been found',
      data: { jobId, matchScore: score },
      priority: score > 0.8 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM
    });
  }

  async processBatchMatching(jobIds: string[]): Promise<Map<string, IWorker[]>> {
    const results = new Map<string, IWorker[]>();
    
    // Process in chunks to avoid overloading
    const chunkSize = 10;
    for (let i = 0; i < jobIds.length; i += chunkSize) {
      const chunk = jobIds.slice(i, i + chunkSize);
      const promises = chunk.map(jobId => this.findMatchingCandidates(jobId));
      const matches = await Promise.all(promises);
      
      chunk.forEach((jobId, index) => {
        results.set(jobId, matches[index]);
      });
    }
    
    return results;
  }
} 