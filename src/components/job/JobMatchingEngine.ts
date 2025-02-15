import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { AnalyticsService } from '../../services/analytics.service';
import { MachineLearningService } from '../../services/ml.service';

@Injectable()
export class JobMatchingEngine {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MATCH_THRESHOLD = 0.7; // 70% match score
  private readonly MAX_MATCHES = 50;
  private readonly SKILL_WEIGHTS = {
    required: 1.5,
    preferred: 1.0,
    bonus: 0.5
  };

  constructor(
    @InjectModel('Job') private jobModel: Model<any>,
    @InjectModel('Candidate') private candidateModel: Model<any>,
    @InjectModel('Match') private matchModel: Model<any>,
    private mlService: MachineLearningService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async findMatches(
    input: MatchingInput
  ): Promise<MatchingResponse> {
    try {
      // Validate matching criteria
      await this.validateMatchingCriteria(input);

      // Get cached matches if available
      const cacheKey = this.generateCacheKey(input);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      // Find potential matches
      const matches = await this.findPotentialMatches(input);

      // Score and rank matches
      const scoredMatches = await this.scoreAndRankMatches(
        matches,
        input
      );

      // Filter matches based on threshold
      const filteredMatches = this.filterMatches(scoredMatches);

      // Store match results
      await this.storeMatchResults(filteredMatches, input);

      // Cache results
      const response = {
        matches: filteredMatches,
        metadata: this.generateMatchMetadata(filteredMatches)
      };
      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error('Error finding matches:', error);
      throw error;
    }
  }

  async updateMatchingProfile(
    input: ProfileUpdateInput
  ): Promise<ProfileUpdateResponse> {
    try {
      // Validate profile update
      await this.validateProfileUpdate(input);

      // Update profile
      const profile = await this.updateProfile(input);

      // Recalculate affected matches
      await this.recalculateMatches(profile);

      return {
        success: true,
        profileId: profile._id,
        message: 'Matching profile updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating matching profile:', error);
      throw error;
    }
  }

  async getMatchAnalytics(
    input: AnalyticsInput
  ): Promise<MatchAnalytics> {
    const cacheKey = `match:analytics:${JSON.stringify(input)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const analytics = await this.calculateMatchAnalytics(input);
      await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      this.logger.error('Error getting match analytics:', error);
      throw error;
    }
  }

  private async findPotentialMatches(
    input: MatchingInput
  ): Promise<any[]> {
    const query = this.buildMatchingQuery(input);
    const matches = await this.candidateModel
      .find(query)
      .limit(this.MAX_MATCHES);

    return matches;
  }

  private async scoreAndRankMatches(
    matches: any[],
    criteria: MatchingInput
  ): Promise<ScoredMatch[]> {
    const scoredMatches = await Promise.all(
      matches.map(async match => {
        const scores = {
          skills: this.calculateSkillScore(match, criteria),
          experience: this.calculateExperienceScore(match, criteria),
          education: this.calculateEducationScore(match, criteria),
          location: await this.calculateLocationScore(match, criteria),
          availability: this.calculateAvailabilityScore(match, criteria)
        };

        const overallScore = this.calculateOverallScore(scores);

        return {
          candidateId: match._id,
          scores,
          overallScore,
          metadata: this.extractMatchMetadata(match)
        };
      })
    );

    return scoredMatches.sort((a, b) => b.overallScore - a.overallScore);
  }

  private calculateSkillScore(
    candidate: any,
    criteria: MatchingInput
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Required skills
    for (const skill of criteria.requirements.skills.required || []) {
      const weight = this.SKILL_WEIGHTS.required;
      totalWeight += weight;
      if (candidate.skills.includes(skill)) {
        score += weight;
      }
    }

    // Preferred skills
    for (const skill of criteria.requirements.skills.preferred || []) {
      const weight = this.SKILL_WEIGHTS.preferred;
      totalWeight += weight;
      if (candidate.skills.includes(skill)) {
        score += weight;
      }
    }

    // Bonus skills
    for (const skill of criteria.requirements.skills.bonus || []) {
      const weight = this.SKILL_WEIGHTS.bonus;
      totalWeight += weight;
      if (candidate.skills.includes(skill)) {
        score += weight;
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private async calculateLocationScore(
    candidate: any,
    criteria: MatchingInput
  ): Promise<number> {
    if (criteria.location.remote) return 1.0;

    const distance = await this.calculateDistance(
      candidate.location,
      criteria.location
    );

    const maxDistance = criteria.location.radius || 50; // default 50km
    return Math.max(0, 1 - (distance / maxDistance));
  }

  private calculateOverallScore(
    scores: Record<string, number>
  ): number {
    const weights = {
      skills: 0.4,
      experience: 0.25,
      education: 0.15,
      location: 0.1,
      availability: 0.1
    };

    return Object.entries(scores).reduce(
      (total, [key, score]) => total + score * weights[key],
      0
    );
  }
}

interface MatchingInput {
  jobId?: string;
  requirements: {
    skills: {
      required: string[];
      preferred?: string[];
      bonus?: string[];
    };
    experience: {
      years: number;
      level: string;
      domains?: string[];
    };
    education: {
      level: string;
      fields?: string[];
    };
  };
  location: {
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    radius?: number;
    remote?: boolean;
  };
  availability?: {
    startDate: Date;
    type: 'full-time' | 'part-time' | 'contract';
    schedule?: string[];
  };
  preferences?: {
    salary?: {
      min: number;
      max: number;
      currency: string;
    };
    benefits?: string[];
    workEnvironment?: string[];
  };
}

interface MatchingResponse {
  matches: ScoredMatch[];
  metadata: {
    total: number;
    threshold: number;
    executionTime: number;
  };
}

interface ScoredMatch {
  candidateId: string;
  scores: {
    skills: number;
    experience: number;
    education: number;
    location: number;
    availability: number;
  };
  overallScore: number;
  metadata: {
    name: string;
    title: string;
    location: string;
    availability: string;
    lastActive: Date;
  };
}

interface ProfileUpdateInput {
  profileId: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: number;
    domain: string;
  }>;
  education?: Array<{
    degree: string;
    field: string;
    institution: string;
  }>;
  availability?: {
    status: string;
    preferences: string[];
  };
  preferences?: Record<string, any>;
}

interface ProfileUpdateResponse {
  success: boolean;
  profileId: string;
  message: string;
}

interface AnalyticsInput {
  period: string;
  metrics?: string[];
  filters?: Record<string, any>;
}

interface MatchAnalytics {
  overview: {
    totalMatches: number;
    averageScore: number;
    matchRate: number;
  };
  distribution: {
    byScore: Record<string, number>;
    byLocation: Record<string, number>;
    bySkill: Record<string, number>;
  };
  trends: Array<{
    period: string;
    metrics: Record<string, number>;
  }>;
  insights: Array<{
    type: string;
    description: string;
    impact: number;
  }>;
} 