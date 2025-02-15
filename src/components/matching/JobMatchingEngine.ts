import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class JobMatchingEngine {
  private readonly MATCH_THRESHOLD = 0.7; // 70% match minimum
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectModel('Job') private jobModel: Model<any>,
    @InjectModel('Worker') private workerModel: Model<any>,
    @InjectModel('MatchingCriteria') private criteriaModel: Model<any>,
    private cacheService: CacheService,
    private notificationService: NotificationService,
    private logger: Logger
  ) {}

  async findMatchesForJob(
    jobId: string,
    options: MatchingOptions = {}
  ): Promise<JobMatchResult> {
    try {
      // Get job details
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check cache
      const cachedMatches = await this.cacheService.get(
        `job_matches:${jobId}`
      );
      if (cachedMatches && !options.forceRefresh) {
        return cachedMatches;
      }

      // Get matching criteria
      const criteria = await this.getMatchingCriteria(job);

      // Find potential candidates
      const candidates = await this.findPotentialCandidates(job, criteria);

      // Score and rank candidates
      const matches = await this.scoreAndRankCandidates(
        job,
        candidates,
        criteria
      );

      // Cache results
      await this.cacheService.set(
        `job_matches:${jobId}`,
        matches,
        this.CACHE_TTL
      );

      // Notify matched candidates if needed
      if (options.notifyMatches) {
        await this.notifyMatchedCandidates(matches);
      }

      return matches;
    } catch (error) {
      this.logger.error('Error finding job matches:', error);
      throw error;
    }
  }

  async findMatchesForWorker(
    workerId: string,
    options: MatchingOptions = {}
  ): Promise<WorkerMatchResult> {
    try {
      // Get worker profile
      const worker = await this.workerModel.findById(workerId);
      if (!worker) {
        throw new Error('Worker not found');
      }

      // Check cache
      const cachedMatches = await this.cacheService.get(
        `worker_matches:${workerId}`
      );
      if (cachedMatches && !options.forceRefresh) {
        return cachedMatches;
      }

      // Get matching criteria
      const criteria = await this.getMatchingCriteria();

      // Find potential jobs
      const jobs = await this.findPotentialJobs(worker, criteria);

      // Score and rank jobs
      const matches = await this.scoreAndRankJobs(
        worker,
        jobs,
        criteria
      );

      // Cache results
      await this.cacheService.set(
        `worker_matches:${workerId}`,
        matches,
        this.CACHE_TTL
      );

      return matches;
    } catch (error) {
      this.logger.error('Error finding worker matches:', error);
      throw error;
    }
  }

  private async getMatchingCriteria(
    context?: any
  ): Promise<MatchingCriteria> {
    const criteria = await this.criteriaModel.findOne({
      status: 'active',
      ...(context && { contextType: context.type })
    });

    return {
      skills: { weight: 0.3, ...criteria?.skills },
      experience: { weight: 0.2, ...criteria?.experience },
      availability: { weight: 0.2, ...criteria?.availability },
      location: { weight: 0.15, ...criteria?.location },
      preferences: { weight: 0.15, ...criteria?.preferences }
    };
  }

  private async findPotentialCandidates(
    job: any,
    criteria: MatchingCriteria
  ): Promise<any[]> {
    const baseQuery = {
      status: 'active',
      'availability.status': 'available'
    };

    // Add location filter
    if (criteria.location.maxDistance) {
      baseQuery['location'] = {
        $near: {
          $geometry: job.location,
          $maxDistance: criteria.location.maxDistance
        }
      };
    }

    // Add skills filter
    if (job.requiredSkills?.length) {
      baseQuery['skills.name'] = {
        $in: job.requiredSkills
      };
    }

    return this.workerModel
      .find(baseQuery)
      .limit(100) // Limit initial candidate pool
      .exec();
  }

  private async findPotentialJobs(
    worker: any,
    criteria: MatchingCriteria
  ): Promise<any[]> {
    const baseQuery = {
      status: 'open',
      startDate: { $gte: new Date() }
    };

    // Add location filter
    if (criteria.location.maxDistance) {
      baseQuery['location'] = {
        $near: {
          $geometry: worker.location,
          $maxDistance: criteria.location.maxDistance
        }
      };
    }

    // Add skills filter
    if (worker.skills?.length) {
      baseQuery['requiredSkills'] = {
        $in: worker.skills.map(s => s.name)
      };
    }

    return this.jobModel
      .find(baseQuery)
      .limit(100) // Limit initial job pool
      .exec();
  }

  private async scoreAndRankCandidates(
    job: any,
    candidates: any[],
    criteria: MatchingCriteria
  ): Promise<JobMatchResult> {
    const scoredCandidates = await Promise.all(
      candidates.map(async candidate => {
        const scores = {
          skills: this.calculateSkillsScore(job, candidate),
          experience: this.calculateExperienceScore(job, candidate),
          availability: await this.calculateAvailabilityScore(job, candidate),
          location: this.calculateLocationScore(job, candidate),
          preferences: this.calculatePreferencesScore(job, candidate)
        };

        const totalScore = this.calculateTotalScore(scores, criteria);

        return {
          candidateId: candidate._id,
          scores,
          totalScore
        };
      })
    );

    // Filter and sort candidates
    const matches = scoredCandidates
      .filter(c => c.totalScore >= this.MATCH_THRESHOLD)
      .sort((a, b) => b.totalScore - a.totalScore);

    return {
      jobId: job._id,
      totalMatches: matches.length,
      matches: matches.slice(0, 50), // Return top 50 matches
      timestamp: new Date()
    };
  }

  private calculateTotalScore(
    scores: Record<string, number>,
    criteria: MatchingCriteria
  ): number {
    return Object.entries(scores).reduce(
      (total, [category, score]) => 
        total + (score * criteria[category].weight),
      0
    );
  }

  private async notifyMatchedCandidates(
    matches: JobMatchResult
  ): Promise<void> {
    const notifications = matches.matches
      .filter(match => match.totalScore >= 0.8) // Notify only high-quality matches
      .map(match => ({
        type: 'JOB_MATCH',
        userId: match.candidateId,
        data: {
          jobId: matches.jobId,
          matchScore: match.totalScore
        }
      }));

    await Promise.all(
      notifications.map(notification =>
        this.notificationService.notify(notification)
      )
    );
  }
}

interface MatchingOptions {
  forceRefresh?: boolean;
  notifyMatches?: boolean;
  criteria?: Partial<MatchingCriteria>;
}

interface MatchingCriteria {
  skills: {
    weight: number;
    requiredMatch?: number;
    preferredMatch?: number;
  };
  experience: {
    weight: number;
    minimumYears?: number;
    relevanceThreshold?: number;
  };
  availability: {
    weight: number;
    requiredOverlap?: number;
  };
  location: {
    weight: number;
    maxDistance?: number;
    preferredDistance?: number;
  };
  preferences: {
    weight: number;
    minimumMatch?: number;
  };
}

interface JobMatchResult {
  jobId: string;
  totalMatches: number;
  matches: Array<{
    candidateId: string;
    scores: Record<string, number>;
    totalScore: number;
  }>;
  timestamp: Date;
}

interface WorkerMatchResult {
  workerId: string;
  totalMatches: number;
  matches: Array<{
    jobId: string;
    scores: Record<string, number>;
    totalScore: number;
  }>;
  timestamp: Date;
} 