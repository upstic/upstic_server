import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IJob, IWorker, IMatch } from '../../interfaces/models.interface';
import { CacheService } from '../../services/cache.service';
import { MLService } from '../../services/ml.service';
import { Logger } from '../../utils/logger';
import { AnalyticsService } from '../../services/analytics.service';

const logger = new Logger('AIMatchingEngine');

@Injectable()
export class AIMatchingEngine {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly MATCH_THRESHOLD = 0.75; // 75% match minimum
  private readonly MAX_RECOMMENDATIONS = 10;

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Match') private readonly matchModel: Model<IMatch>,
    private readonly cacheService: CacheService,
    private readonly mlService: MLService,
    private analyticsService: AnalyticsService
  ) {}

  async findMatches(
    input: MatchingInput
  ): Promise<MatchingResponse> {
    try {
      const cacheKey = this.generateCacheKey(input);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      // Get relevant entities
      const [jobs, workers] = await Promise.all([
        this.getJobs(input),
        this.getWorkers(input)
      ]);

      // Generate embeddings
      const embeddings = await this.generateEmbeddings(jobs, workers);

      // Calculate matches
      const matches = await this.calculateMatches(
        embeddings,
        input.preferences
      );

      // Apply filters and ranking
      const rankedMatches = await this.rankMatches(
        matches,
        input.filters
      );

      // Store match history
      await this.storeMatchHistory(rankedMatches);

      // Track analytics
      await this.trackMatchingAnalytics(rankedMatches);

      const response = {
        matches: rankedMatches,
        metadata: this.generateMatchMetadata(rankedMatches)
      };

      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
      return response;

    } catch (error) {
      logger.error('Error finding matches:', error);
      throw error;
    }
  }

  async improveMatches(input: FeedbackInput): Promise<void> {
    try {
      // Validate feedback
      this.validateFeedback(input);

      // Store feedback
      await this.storeFeedback(input);

      // Update match history
      await this.updateMatchHistory(input.matchId, input);

      // Retrain model if needed
      await this.checkAndRetrainModel();
    } catch (error) {
      logger.error('Error improving matches:', error);
      throw error;
    }
  }

  async getMatchingInsights(
    entityId: string,
    type: 'job' | 'worker'
  ): Promise<MatchingInsights> {
    const cacheKey = `matching:insights:${type}:${entityId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const history = await this.matchModel.find({
        [`${type}Id`]: entityId
      });

      const insights = await this.generateInsights(history);
      await this.cacheService.set(cacheKey, insights, this.CACHE_TTL);

      return insights;
    } catch (error) {
      logger.error('Error getting matching insights:', error);
      throw error;
    }
  }

  private async getJobs(filters: any = {}): Promise<IJob[]> {
    return this.jobModel.find(filters).lean();
  }

  private async getWorkers(filters: any = {}): Promise<IWorker[]> {
    return this.workerModel.find(filters).lean();
  }

  private async storeMatchHistory(matches: any[]): Promise<void> {
    await this.matchModel.insertMany(matches);
  }

  private async trackMatchingAnalytics(matches: any[]): Promise<void> {
    // Implementation
  }

  private generateMatchMetadata(matches: RankedMatch[]): any {
    return {
      totalCandidates: matches.length,
      filteredCandidates: matches.length,
      averageScore: matches.reduce((acc, m) => acc + m.similarity, 0) / matches.length,
      executionTime: Date.now()
    };
  }

  private validateFeedback(feedback: any): boolean {
    return true; // Add validation logic
  }

  private async storeFeedback(feedback: any): Promise<void> {
    // Implementation
  }

  private async updateMatchHistory(matchId: string, feedback: any): Promise<void> {
    // Implementation
  }

  private async checkAndRetrainModel(): Promise<void> {
    // Implementation
  }

  private applyWeights(scores: number[], weights: number[]): number {
    return scores.reduce((acc, score, i) => acc + score * weights[i], 0);
  }

  private applyHardFilters(workers: IWorker[], job: IJob): IWorker[] {
    // Implementation
    return workers;
  }

  private applySoftFilters(workers: IWorker[], job: IJob): IWorker[] {
    // Implementation
    return workers;
  }

  private rankByScore(matches: any[]): any[] {
    return matches.sort((a, b) => b.score - a.score);
  }

  private async calculateMatchRates(matches: any[]): Promise<{
    overall: number;
    byCategory: Record<string, number>;
  }> {
    return {
      overall: 0.75,
      byCategory: {
        skills: 0.8,
        experience: 0.7,
        location: 0.9
      }
    };
  }

  private async analyzeTrends(matches: any[]): Promise<any> {
    // Implementation
    return {};
  }

  private async generateRecommendations(analysis: any): Promise<any[]> {
    // Implementation
    return [];
  }

  private async generateEmbeddings(
    jobs: IJob[],
    workers: IWorker[]
  ): Promise<Embeddings> {
    const jobEmbeddings = await this.mlService.generateEmbeddings(
      jobs.map(job => this.prepareJobFeatures(job as IJobExtended))
    );

    const workerEmbeddings = await this.mlService.generateEmbeddings(
      workers.map(worker => this.prepareWorkerFeatures(worker as IWorkerExtended))
    );

    return {
      jobs: jobEmbeddings,
      workers: workerEmbeddings
    };
  }

  private async calculateMatches(
    embeddings: Embeddings,
    preferences: MatchPreferences
  ): Promise<RawMatch[]> {
    const similarities = await this.mlService.calculateSimilarities(
      embeddings.jobs,
      embeddings.workers
    );

    const weights = this.calculateWeights(preferences);
    return similarities.map((row, i) => 
      row.map((similarity, j) => ({
        jobId: `job_${i}`,
        workerId: `worker_${j}`,
        similarity,
        scores: { similarity }
      }))
    ).flat();
  }

  private async rankMatches(
    matches: RawMatch[],
    filters: MatchFilters
  ): Promise<RankedMatch[]> {
    // Apply hard filters
    let filteredMatches = matches.filter(match => 
      match.similarity >= (filters.minMatchScore || 0)
    );

    // Apply soft filters
    filteredMatches = filteredMatches.filter(match => 
      this.applySoftMatchFilters(match, filters)
    );

    // Final ranking
    return filteredMatches
      .map((match, index) => ({
        ...match,
        rank: index + 1,
        confidence: match.similarity,
        factors: this.calculateMatchFactors(match)
      }))
      .slice(0, this.MAX_RECOMMENDATIONS);
  }

  private applySoftMatchFilters(match: RawMatch, filters: MatchFilters): boolean {
    // Implementation
    return true;
  }

  private calculateMatchFactors(match: RawMatch): { positive: string[]; negative: string[] } {
    return {
      positive: [],
      negative: []
    };
  }

  private prepareJobFeatures(job: IJobExtended): any {
    return {
      skills: job.requiredSkills,
      experience: job.requiredExperience,
      location: job.location,
      industry: job.industry,
      jobType: job.type,
      schedule: job.schedule,
      salary: job.salary,
      // Additional features...
    };
  }

  private prepareWorkerFeatures(worker: IWorkerExtended): any {
    return {
      skills: worker.skills,
      experience: worker.experience,
      location: worker.location,
      industries: worker.preferredIndustries,
      availability: worker.availability,
      salary: worker.expectedSalary,
      // Additional features...
    };
  }

  private calculateWeights(
    preferences: MatchPreferences
  ): Weights {
    return {
      skills: preferences.skillsPriority || 1,
      experience: preferences.experiencePriority || 0.8,
      location: preferences.locationPriority || 0.7,
      availability: preferences.availabilityPriority || 0.9,
      salary: preferences.salaryPriority || 0.6
    };
  }

  private async generateInsights(
    history: any[]
  ): Promise<MatchingInsights> {
    const matchRates = await this.calculateMatchRates(history);
    const trends = await this.analyzeTrends(history);
    const recommendations = await this.generateRecommendations(history);

    return {
      matchRates: await matchRates,
      trends,
      recommendations,
      lastUpdated: new Date()
    };
  }

  private generateCacheKey(input: MatchingInput): string {
    return `matching:${input.type}:${input.entityId}:${
      JSON.stringify(input.preferences)
    }:${JSON.stringify(input.filters)}`;
  }
}

interface MatchingInput {
  type: 'job' | 'worker';
  entityId: string;
  preferences: MatchPreferences;
  filters: MatchFilters;
}

interface MatchPreferences {
  skillsPriority?: number;
  experiencePriority?: number;
  locationPriority?: number;
  availabilityPriority?: number;
  salaryPriority?: number;
}

interface MatchFilters {
  minMatchScore?: number;
  maxDistance?: number;
  requiredSkills?: string[];
  minExperience?: number;
  salaryRange?: {
    min: number;
    max: number;
  };
  availability?: {
    startDate: Date;
    endDate: Date;
  };
}

interface Embeddings {
  jobs: number[][];
  workers: number[][];
}

interface RawMatch {
  jobId: string;
  workerId: string;
  similarity: number;
  scores: Record<string, number>;
}

interface RankedMatch extends RawMatch {
  rank: number;
  confidence: number;
  factors: {
    positive: string[];
    negative: string[];
  };
}

interface Weights {
  skills: number;
  experience: number;
  location: number;
  availability: number;
  salary: number;
}

interface FeedbackInput {
  matchId: string;
  type: 'accept' | 'reject';
  reason?: string;
  rating?: number;
  comments?: string;
}

interface MatchingResponse {
  matches: RankedMatch[];
  metadata: {
    totalCandidates: number;
    filteredCandidates: number;
    averageScore: number;
    executionTime: number;
  };
}

interface MatchingInsights {
  matchRates: {
    overall: number;
    byCategory: Record<string, number>;
  };
  trends: {
    daily: Array<{
      date: string;
      matches: number;
      acceptanceRate: number;
    }>;
    weekly: Array<{
      week: string;
      matches: number;
      acceptanceRate: number;
    }>;
  };
  recommendations: Array<{
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  lastUpdated: Date;
}

interface IJobExtended extends IJob {
  requiredSkills: string[];
  requiredExperience: number;
  industry: string;
  type: string;
  schedule: string;
}

interface IWorkerExtended extends IWorker {
  preferredIndustries: string[];
  expectedSalary: {
    amount: number;
    currency: string;
  };
} 