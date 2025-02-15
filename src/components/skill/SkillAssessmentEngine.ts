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
export class SkillAssessmentEngine {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly SKILL_LEVELS = [
    'beginner',
    'intermediate',
    'advanced',
    'expert'
  ] as const;
  private readonly ASSESSMENT_TYPES = [
    'technical',
    'soft_skills',
    'language',
    'certification'
  ] as const;
  private readonly SCORE_WEIGHTS = {
    test_score: 0.4,
    experience: 0.3,
    projects: 0.2,
    endorsements: 0.1
  };

  constructor(
    @InjectModel('Assessment') private assessmentModel: Model<any>,
    @InjectModel('Skill') private skillModel: Model<any>,
    @InjectModel('Result') private resultModel: Model<any>,
    private mlService: MachineLearningService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async assessSkills(
    input: AssessmentInput
  ): Promise<AssessmentResponse> {
    try {
      // Validate assessment input
      await this.validateAssessment(input);

      // Create assessment record
      const assessment = await this.assessmentModel.create({
        ...input,
        status: 'pending',
        createdAt: new Date()
      });

      // Process assessment asynchronously
      this.processAssessment(assessment).catch(error => {
        this.logger.error('Error processing assessment:', error);
        this.updateAssessmentStatus(
          assessment._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        assessmentId: assessment._id,
        message: 'Assessment initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating assessment:', error);
      throw error;
    }
  }

  async getSkillGap(
    input: GapAnalysisInput
  ): Promise<GapAnalysisResponse> {
    try {
      // Validate gap analysis input
      await this.validateGapAnalysis(input);

      // Get current skills
      const currentSkills = await this.getCurrentSkills(input.candidateId);

      // Get required skills
      const requiredSkills = await this.getRequiredSkills(input.jobId);

      // Analyze skill gap
      const analysis = await this.analyzeSkillGap(
        currentSkills,
        requiredSkills
      );

      return {
        gaps: analysis.gaps,
        recommendations: analysis.recommendations,
        metadata: {
          candidateId: input.candidateId,
          jobId: input.jobId,
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error analyzing skill gap:', error);
      throw error;
    }
  }

  async generateSkillReport(
    input: ReportInput
  ): Promise<SkillReport> {
    const cacheKey = `skill:report:${JSON.stringify(input)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const report = await this.compileSkillReport(input);
      await this.cacheService.set(cacheKey, report, this.CACHE_TTL);

      return report;
    } catch (error) {
      this.logger.error('Error generating skill report:', error);
      throw error;
    }
  }

  private async processAssessment(
    assessment: any
  ): Promise<void> {
    try {
      // Get assessment criteria
      const criteria = await this.getAssessmentCriteria(
        assessment.type,
        assessment.level
      );

      // Evaluate skills
      const evaluations = await this.evaluateSkills(
        assessment.skills,
        criteria
      );

      // Calculate scores
      const scores = this.calculateSkillScores(evaluations);

      // Generate insights
      const insights = await this.generateSkillInsights(
        scores,
        assessment
      );

      // Store results
      const results = await this.storeAssessmentResults(
        assessment._id,
        scores,
        insights
      );

      // Update assessment status
      await this.updateAssessmentStatus(
        assessment._id,
        'completed',
        null,
        results
      );

      // Notify completion
      await this.notifyAssessmentCompletion(assessment, results);
    } catch (error) {
      throw error;
    }
  }

  private async evaluateSkills(
    skills: string[],
    criteria: any
  ): Promise<SkillEvaluation[]> {
    return Promise.all(
      skills.map(async skill => {
        const evaluation = {
          skill,
          scores: {
            test: await this.evaluateTestScore(skill, criteria),
            experience: await this.evaluateExperience(skill),
            projects: await this.evaluateProjects(skill),
            endorsements: await this.evaluateEndorsements(skill)
          }
        };

        evaluation.overall = this.calculateOverallScore(evaluation.scores);
        evaluation.level = this.determineSkillLevel(evaluation.overall);

        return evaluation;
      })
    );
  }

  private calculateSkillScores(
    evaluations: SkillEvaluation[]
  ): SkillScore[] {
    return evaluations.map(eval => ({
      skill: eval.skill,
      scores: eval.scores,
      overall: eval.overall,
      level: eval.level,
      confidence: this.calculateConfidence(eval.scores)
    }));
  }

  private calculateOverallScore(
    scores: Record<string, number>
  ): number {
    return Object.entries(scores).reduce(
      (total, [key, score]) => total + score * this.SCORE_WEIGHTS[key],
      0
    );
  }

  private determineSkillLevel(
    score: number
  ): typeof SkillAssessmentEngine.prototype.SKILL_LEVELS[number] {
    if (score >= 0.9) return 'expert';
    if (score >= 0.7) return 'advanced';
    if (score >= 0.4) return 'intermediate';
    return 'beginner';
  }
}

interface AssessmentInput {
  candidateId: string;
  type: typeof SkillAssessmentEngine.prototype.ASSESSMENT_TYPES[number];
  skills: string[];
  level: typeof SkillAssessmentEngine.prototype.SKILL_LEVELS[number];
  metadata?: Record<string, any>;
}

interface AssessmentResponse {
  success: boolean;
  assessmentId: string;
  message: string;
}

interface GapAnalysisInput {
  candidateId: string;
  jobId: string;
  options?: {
    includeRecommendations?: boolean;
    detailedAnalysis?: boolean;
  };
}

interface GapAnalysisResponse {
  gaps: Array<{
    skill: string;
    required: {
      level: string;
      importance: string;
    };
    current: {
      level: string;
      confidence: number;
    };
    gap: number;
  }>;
  recommendations: Array<{
    skill: string;
    type: string;
    resources: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    candidateId: string;
    jobId: string;
    timestamp: Date;
  };
}

interface ReportInput {
  candidateId: string;
  period?: {
    start: Date;
    end: Date;
  };
  skills?: string[];
  type?: string[];
}

interface SkillReport {
  overview: {
    totalSkills: number;
    averageLevel: string;
    topSkills: Array<{
      skill: string;
      level: string;
      score: number;
    }>;
  };
  progress: {
    improved: string[];
    new: string[];
    needsWork: string[];
  };
  details: Array<{
    skill: string;
    assessments: Array<{
      date: Date;
      score: number;
      level: string;
    }>;
    projects: number;
    endorsements: number;
  }>;
  recommendations: Array<{
    skill: string;
    action: string;
    resources: string[];
  }>;
}

interface SkillEvaluation {
  skill: string;
  scores: {
    test: number;
    experience: number;
    projects: number;
    endorsements: number;
  };
  overall: number;
  level: string;
}

interface SkillScore extends SkillEvaluation {
  confidence: number;
} 