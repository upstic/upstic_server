import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IJob, IWorker, IApplication, IMatch } from '../interfaces/models.interface';
import { NotificationService } from './notification.service';
import { Logger } from '../utils/logger';
import { MatchingService } from './matching.service';

const logger = new Logger('AIMatchingService');

interface MatchResult {
  score: number;
  details: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    salaryMatch: number;
  };
}

interface Location {
  lat: number;
  lng: number;
}

@Injectable()
export class AIMatchingService {
  private readonly matchThreshold = 0.7;
  private readonly maxDistance = 50; // km
  private readonly maxSalaryDiff = 20; // percent

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>,
    @InjectModel('Match') private readonly matchModel: Model<IMatch>,
    private readonly notificationService: NotificationService,
    private readonly matchingService: MatchingService
  ) {}

  async findMatchingJobs(workerId: string): Promise<IJob[]> {
    try {
      const worker = await this.workerModel.findById(workerId);
      if (!worker) {
        throw new Error('Worker not found');
      }

      const jobs = await this.jobModel.find({ status: 'active' });
      return this.calculateJobMatches(worker, jobs);
    } catch (error) {
      logger.error('Error finding matching jobs:', { error, workerId } as any);
      throw error;
    }
  }

  private async calculateJobMatches(worker: IWorker, jobs: IJob[]): Promise<IJob[]> {
    const matches: IJob[] = [];

    for (const job of jobs) {
      const match = await this.calculateMatch(worker, job);
      if (match.score >= this.matchThreshold) {
        matches.push(job);
      }
    }

    return matches;
  }

  private async calculateMatch(worker: IWorker, job: IJob): Promise<MatchResult> {
    const skillMatch = this.calculateSkillMatch(worker.skills, job.skills);
    const experienceMatch = this.calculateExperienceMatch(worker.experience, job.experience);
    
    const locationMatch = this.calculateLocationMatch(worker, job);

    const salaryMatch = this.calculateSalaryMatch(worker.salary, job.salary);

    const score = (skillMatch + experienceMatch + locationMatch + salaryMatch) / 4;

    return {
      score,
      details: {
        skillMatch,
        experienceMatch,
        locationMatch,
        salaryMatch
      }
    };
  }

  private calculateSkillMatch(workerSkills: string[], jobSkills: string[]): number {
    const matchingSkills = workerSkills.filter(skill => jobSkills.includes(skill));
    return matchingSkills.length / jobSkills.length;
  }

  private calculateExperienceMatch(workerExp: number, requiredExp: number): number {
    return Math.min(workerExp / requiredExp, 1);
  }

  private calculateLocationMatch(worker: IWorker, job: IJob): number {
    try {
      const workerLocation = this.parseLocation(worker.preferredLocation);
      const jobLocation = this.parseLocation(job.location);
      
      if (!workerLocation || !jobLocation) {
        return 0;
      }

      const distance = this.calculateDistance(workerLocation, jobLocation);
      return Math.max(0, 1 - distance/this.maxDistance);
    } catch (error) {
      logger.error('Error calculating location match:', { error });
      return 0;
    }
  }

  private calculateDistance(point1: Location, point2: Location): number {
    if (!point1?.lat || !point1?.lng || !point2?.lat || !point2?.lng) {
      logger.warn('Invalid location data:', { point1, point2 });
      return Infinity; // Return maximum distance if location data is invalid
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private parseLocation(location: any): Location | null {
    try {
      if (typeof location === 'string') {
        const parsed = JSON.parse(location);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed as Location;
        }
      } else if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        return location as Location;
      }
      return null;
    } catch (error) {
      logger.error('Error parsing location:', { error, location });
      return null;
    }
  }

  async findMatchingCandidates(jobId: string): Promise<IWorker[]> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const workers = await this.workerModel.find({ 'availability.status': 'available' });
      return this.calculateCandidateMatches(job, workers);
    } catch (error) {
      logger.error('Error finding matching candidates:', { error, jobId } as any);
      throw error;
    }
  }

  private async calculateCandidateMatches(job: IJob, workers: IWorker[]): Promise<IWorker[]> {
    const matches: IWorker[] = [];

    for (const worker of workers) {
      const match = await this.calculateMatch(worker, job);
      if (match.score >= this.matchThreshold) {
        matches.push(worker);
      }
    }

    return matches;
  }

  async notifyMatchingJobs(workerId: string): Promise<void> {
    try {
      const jobs = await this.findMatchingJobs(workerId);
      for (const job of jobs) {
        await this.notificationService.sendJobMatchNotification(workerId, job._id.toString());
      }
    } catch (error) {
      logger.error('Error notifying matching jobs:', { error, workerId } as any);
      throw error;
    }
  }

  async findMatches(jobId: string): Promise<IMatch[]> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job) {
        throw new Error(`Job with id ${jobId} not found`);
      }

      // Get all available workers
      const workers = await this.workerModel.find({ 
        status: 'AVAILABLE',
        skills: { $in: job.skills }
      }).lean();

      // Calculate match scores
      const matches = await Promise.all(workers.map(async worker => {
        const skillScore = this.calculateSkillMatch(worker.skills, job.skills);
        const expScore = this.calculateExperienceMatch(worker.experience, job.experience);
        
        const workerLocation = this.parseLocation(worker.preferredLocation);
        const jobLocation = this.parseLocation(job.location);
        const distanceScore = (workerLocation && jobLocation)
          ? this.calculateDistance(workerLocation, jobLocation)
          : this.maxDistance;

        const totalScore = (
          skillScore * 0.4 + 
          expScore * 0.3 + 
          Math.max(0, 1 - distanceScore/this.maxDistance) * 0.3
        );

        const match = await this.matchModel.create({
          jobId: job._id.toString(),
          workerId: worker._id.toString(),
          score: totalScore,
          status: 'PENDING'
        });

        // Notify worker about the match if score is above threshold
        if (totalScore >= this.matchThreshold) {
          await this.notificationService.sendJobMatchNotification(
            worker._id.toString(),
            job._id.toString()
          );
        }

        return match;
      }));

      return matches;
    } catch (error) {
      logger.error('Error finding matches:', { error, jobId });
      throw error;
    }
  }

  private calculateSalaryMatch(workerSalary: any, jobSalary: any): number {
    try {
      const workerExpectedSalary = workerSalary?.expected || 0;
      const jobMaxSalary = jobSalary?.max || 0;
      if (!workerExpectedSalary || !jobMaxSalary) return 0;

      const salaryDiff = Math.abs(workerExpectedSalary - jobMaxSalary) / jobMaxSalary * 100;
      return Math.max(0, 1 - (salaryDiff / this.maxSalaryDiff));
    } catch (error) {
      logger.error('Error calculating salary match:', { error });
      return 0;
    }
  }

  async getRecommendations(workerId: string): Promise<IJob[]> {
    // Implementation
    return [];
  }

  async getJobInsights(jobId: string): Promise<any> {
    // Implementation
    return {};
  }
}