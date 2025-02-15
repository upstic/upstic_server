import { SearchProfile, MatchPriority, ISearchProfile } from '../models/SearchProfile';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Shift } from '../models/Shift';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { calculateMatchScore } from '../utils/match-calculator';
import { validateAvailability } from '../utils/time-validator';
import { geocodeAddress } from '../utils/geocoding';
import { sanitizeHtml } from '../utils/sanitizer';
import { Queue } from 'bullmq';
import { logger } from '../utils/logger';
import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Worker } from '../models/Worker';
import { Company } from '../models/Company';
import { CacheService } from './cache.service';

@Injectable()
export class SearchService {
  private static matchingQueue: Queue;
  private static readonly MIN_MATCH_SCORE = 60;
  private static readonly MAX_SEARCH_RESULTS = 100;
  private static readonly LOCATION_WEIGHT = 0.3;
  private static readonly SKILLS_WEIGHT = 0.4;
  private static readonly AVAILABILITY_WEIGHT = 0.3;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Worker.name) private workerModel: Model<Worker>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    private configService: ConfigService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  static initialize() {
    this.matchingQueue = new Queue('matching', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async createSearchProfile(
    userId: string,
    creatorId: string,
    profileData: Partial<ISearchProfile>
  ): Promise<ISearchProfile> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate availability
    await validateAvailability(profileData.availability!);

    // Geocode location if coordinates not provided
    if (!profileData.location?.coordinates && profileData.location?.city) {
      const coordinates = await geocodeAddress(
        profileData.location.city,
        profileData.location.state,
        profileData.location.country
      );
      if (coordinates) {
        profileData.location.coordinates = coordinates;
      }
    }

    // Sanitize input
    const sanitizedData = this.sanitizeProfileData(profileData);

    const searchProfile = new SearchProfile({
      ...sanitizedData,
      userId,
      metadata: {
        createdBy: creatorId,
        createdAt: new Date(),
        lastModifiedBy: creatorId,
        lastModifiedAt: new Date(),
        version: 1
      }
    });

    await searchProfile.save();

    // Queue initial matching
    await this.queueMatching(searchProfile);

    return searchProfile;
  }

  static async updateSearchProfile(
    profileId: string,
    userId: string,
    updates: Partial<ISearchProfile>
  ): Promise<ISearchProfile> {
    const profile = await SearchProfile.findById(profileId);
    if (!profile) {
      throw new AppError(404, 'Search profile not found');
    }

    if (profile.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    // Validate availability if updating
    if (updates.availability) {
      await validateAvailability(updates.availability);
    }

    // Update location coordinates if city changed
    if (updates.location?.city && updates.location.city !== profile.location.city) {
      const coordinates = await geocodeAddress(
        updates.location.city,
        updates.location.state || profile.location.state,
        updates.location.country || profile.location.country
      );
      if (coordinates) {
        updates.location.coordinates = coordinates;
      }
    }

    // Sanitize updates
    const sanitizedUpdates = this.sanitizeProfileData(updates);

    Object.assign(profile, sanitizedUpdates);
    profile.metadata.lastModifiedBy = userId;
    profile.metadata.lastModifiedAt = new Date();
    profile.metadata.version += 1;

    await profile.save();

    // Queue matching with updated profile
    await this.queueMatching(profile);

    return profile;
  }

  static async findMatches(
    jobId: string,
    options: {
      minScore?: number;
      maxResults?: number;
      requiredSkills?: string[];
      requiredCertifications?: string[];
      locationRadius?: number;
    } = {}
  ): Promise<Array<{ profile: ISearchProfile; score: number }>> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    const query: any = { isActive: true };

    // Filter by required skills
    if (options.requiredSkills?.length) {
      query['skills.name'] = { $all: options.requiredSkills };
    }

    // Filter by required certifications
    if (options.requiredCertifications?.length) {
      query['certifications.name'] = { $all: options.requiredCertifications };
    }

    // Filter by location if not remote
    if (!job.isRemote && job.location.coordinates) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              job.location.coordinates.longitude,
              job.location.coordinates.latitude
            ]
          },
          $maxDistance: options.locationRadius || 50000 // Default 50km
        }
      };
    }

    const searchProfiles = await SearchProfile.find(query);

    // Calculate match scores
    const matches = await Promise.all(
      searchProfiles.map(async profile => {
        const score = await calculateMatchScore(profile, job);
        return { profile, score };
      })
    );

    // Filter and sort by score
    return matches
      .filter(match => match.score >= (options.minScore || this.MIN_MATCH_SCORE))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || this.MAX_SEARCH_RESULTS);
  }

  static async findJobMatches(
    profileId: string,
    options: {
      minScore?: number;
      maxResults?: number;
      jobTypes?: string[];
      locationRadius?: number;
    } = {}
  ): Promise<Array<{ job: any; score: number }>> {
    const profile = await SearchProfile.findById(profileId);
    if (!profile) {
      throw new AppError(404, 'Search profile not found');
    }

    const query: any = { status: 'active' };

    // Filter by job types
    if (options.jobTypes?.length) {
      query.jobType = { $in: options.jobTypes };
    }

    // Filter by location if not remote
    if (!profile.location.remoteOnly && profile.location.coordinates) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              profile.location.coordinates.longitude,
              profile.location.coordinates.latitude
            ]
          },
          $maxDistance: options.locationRadius || profile.location.maxDistance || 50000
        }
      };
    }

    const jobs = await Job.find(query);

    // Calculate match scores
    const matches = await Promise.all(
      jobs.map(async job => {
        const score = await calculateMatchScore(profile, job);
        return { job, score };
      })
    );

    // Filter and sort by score
    return matches
      .filter(match => match.score >= (options.minScore || this.MIN_MATCH_SCORE))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || this.MAX_SEARCH_RESULTS);
  }

  private static sanitizeProfileData(data: Partial<ISearchProfile>): Partial<ISearchProfile> {
    if (data.skills) {
      data.skills = data.skills.map(skill => ({
        ...skill,
        name: sanitizeHtml(skill.name)
      }));
    }

    if (data.certifications) {
      data.certifications = data.certifications.map(cert => ({
        ...cert,
        name: sanitizeHtml(cert.name)
      }));
    }

    if (data.preferences) {
      Object.keys(data.preferences).forEach(key => {
        if (Array.isArray(data.preferences[key])) {
          data.preferences[key] = data.preferences[key].map(item => sanitizeHtml(item));
        }
      });
    }

    return data;
  }

  private static async queueMatching(profile: ISearchProfile): Promise<void> {
    await this.matchingQueue.add('match-profile', {
      profileId: profile._id,
      userId: profile.userId
    });
  }

  static async processMatchingQueue(): Promise<void> {
    this.matchingQueue.process('match-profile', async job => {
      const { profileId, userId } = job.data;

      try {
        const matches = await this.findJobMatches(profileId);
        
        if (matches.length > 0) {
          await notificationService.send({
            userId,
            title: 'New Job Matches',
            body: `We found ${matches.length} new job matches for your profile`,
            type: 'JOB_MATCHES',
            data: { 
              profileId,
              matchCount: matches.length,
              topMatch: matches[0].job._id
            }
          });
        }

        // Update last match timestamp
        await SearchProfile.findByIdAndUpdate(profileId, {
          'metadata.lastMatchAt': new Date()
        });

      } catch (error) {
        logger.error('Error processing match queue', {
          profileId,
          error: error.message
        });
        throw error;
      }
    });
  }

  async searchJobs(params: JobSearchParams): Promise<SearchResult<Job>> {
    try {
      const cacheKey = `job_search:${JSON.stringify(params)}`;
      const cachedResults = await this.cacheService.get(cacheKey);

      if (cachedResults) {
        return JSON.parse(cachedResults);
      }

      const query = this.buildJobSearchQuery(params);
      const results = await this.elasticsearchService.search({
        index: 'jobs',
        body: query
      });

      const jobs = await this.hydrateJobResults(results.hits.hits);
      const searchResult = {
        total: results.hits.total.value,
        results: jobs,
        aggregations: results.aggregations
      };

      await this.cacheService.set(cacheKey, JSON.stringify(searchResult), this.CACHE_TTL);
      return searchResult;
    } catch (error) {
      this.logger.error('Error searching jobs:', error);
      throw error;
    }
  }

  async searchWorkers(params: WorkerSearchParams): Promise<SearchResult<Worker>> {
    try {
      const cacheKey = `worker_search:${JSON.stringify(params)}`;
      const cachedResults = await this.cacheService.get(cacheKey);

      if (cachedResults) {
        return JSON.parse(cachedResults);
      }

      const query = this.buildWorkerSearchQuery(params);
      const results = await this.elasticsearchService.search({
        index: 'workers',
        body: query
      });

      const workers = await this.hydrateWorkerResults(results.hits.hits);
      const searchResult = {
        total: results.hits.total.value,
        results: workers,
        aggregations: results.aggregations
      };

      await this.cacheService.set(cacheKey, JSON.stringify(searchResult), this.CACHE_TTL);
      return searchResult;
    } catch (error) {
      this.logger.error('Error searching workers:', error);
      throw error;
    }
  }

  private buildJobSearchQuery(params: JobSearchParams): any {
    const query: any = {
      bool: {
        must: [],
        filter: []
      }
    };

    if (params.keyword) {
      query.bool.must.push({
        multi_match: {
          query: params.keyword,
          fields: ['title^3', 'description', 'requirements', 'company.name'],
          fuzziness: 'AUTO'
        }
      });
    }

    if (params.location) {
      query.bool.filter.push({
        geo_distance: {
          distance: `${params.radius || 50}km`,
          'location.coordinates': params.location
        }
      });
    }

    if (params.skills && params.skills.length > 0) {
      query.bool.filter.push({
        terms: { 'requiredSkills.name': params.skills }
      });
    }

    // Add more filters based on params...

    return {
      query,
      sort: this.buildSortCriteria(params.sort),
      from: (params.page - 1) * params.limit,
      size: Math.min(params.limit, this.MAX_SEARCH_RESULTS),
      aggs: this.buildJobAggregations()
    };
  }

  private buildWorkerSearchQuery(params: WorkerSearchParams): any {
    // Similar to buildJobSearchQuery but for workers
    // Implementation details...
    return {};
  }

  private buildSortCriteria(sort?: string): any[] {
    const criteria = [];

    if (sort) {
      switch (sort) {
        case 'recent':
          criteria.push({ createdAt: 'desc' });
          break;
        case 'salary':
          criteria.push({ 'salary.amount': 'desc' });
          break;
        case 'relevance':
          criteria.push('_score');
          break;
      }
    }

    return criteria;
  }

  private buildJobAggregations(): any {
    return {
      job_types: {
        terms: { field: 'type' }
      },
      salary_ranges: {
        range: {
          field: 'salary.amount',
          ranges: [
            { to: 30000 },
            { from: 30000, to: 60000 },
            { from: 60000, to: 90000 },
            { from: 90000 }
          ]
        }
      },
      skills: {
        terms: { field: 'requiredSkills.name', size: 20 }
      },
      locations: {
        terms: { field: 'location.city', size: 20 }
      }
    };
  }

  private async hydrateJobResults(hits: any[]): Promise<Job[]> {
    const jobIds = hits.map(hit => hit._id);
    const jobs = await this.jobModel
      .find({ _id: { $in: jobIds } })
      .populate('company', 'name logo');

    return jobs;
  }

  private async hydrateWorkerResults(hits: any[]): Promise<Worker[]> {
    const workerIds = hits.map(hit => hit._id);
    return this.workerModel.find({ _id: { $in: workerIds } });
  }

  async reindexAll(): Promise<void> {
    try {
      await Promise.all([
        this.reindexJobs(),
        this.reindexWorkers()
      ]);
    } catch (error) {
      this.logger.error('Error reindexing:', error);
      throw error;
    }
  }

  private async reindexJobs(): Promise<void> {
    const jobs = await this.jobModel
      .find({ status: 'active' })
      .populate('company', 'name logo');

    const operations = jobs.flatMap(job => [
      { index: { _index: 'jobs', _id: job._id } },
      this.transformJobForIndexing(job)
    ]);

    await this.elasticsearchService.bulk({ body: operations });
  }

  private transformJobForIndexing(job: any): any {
    return {
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      company: {
        name: job.company.name,
        logo: job.company.logo
      },
      location: job.location,
      salary: job.salary,
      requiredSkills: job.requiredSkills,
      type: job.type,
      createdAt: job.createdAt
    };
  }
}

interface JobSearchParams {
  keyword?: string;
  location?: {
    lat: number;
    lon: number;
  };
  radius?: number;
  skills?: string[];
  type?: string[];
  salary?: {
    min?: number;
    max?: number;
  };
  experience?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sort?: string;
}

interface WorkerSearchParams {
  keyword?: string;
  location?: {
    lat: number;
    lon: number;
  };
  radius?: number;
  skills?: string[];
  availability?: string[];
  experience?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sort?: string;
}

interface SearchResult<T> {
  total: number;
  results: T[];
  aggregations?: any;
}

// Initialize the service
SearchService.initialize(); 