import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { NotificationService } from '../../services/notification.service';
import { EmailService } from '../../services/email.service';
import { CacheService } from '../../services/cache.service';
import { ValidationService } from '../../services/validation.service';
import { AnalyticsService } from '../../services/analytics.service';

@Injectable()
export class CandidateRelationshipManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly ENGAGEMENT_THRESHOLD = 30; // days
  private readonly ENGAGEMENT_THRESHOLDS = {
    low: 30,    // days without interaction
    medium: 15,
    high: 7
  };
  private readonly STATUS_TRANSITIONS = {
    new: ['screening', 'rejected'],
    screening: ['qualified', 'rejected'],
    qualified: ['interviewing', 'onhold', 'rejected'],
    interviewing: ['offered', 'rejected'],
    offered: ['hired', 'rejected'],
    hired: ['active'],
    rejected: ['archived']
  };

  constructor(
    @InjectModel('Candidate') private candidateModel: Model<any>,
    @InjectModel('Interaction') private interactionModel: Model<any>,
    @InjectModel('Pipeline') private pipelineModel: Model<any>,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private cacheService: CacheService,
    private logger: Logger,
    private validationService: ValidationService,
    private analyticsService: AnalyticsService
  ) {}

  async trackCandidateInteraction(
    input: CandidateInteractionInput
  ): Promise<InteractionResponse> {
    try {
      // Record interaction
      const interaction = await this.interactionModel.create({
        ...input,
        timestamp: new Date(),
        status: 'active'
      });

      // Update candidate's last interaction
      await this.updateCandidateLastInteraction(
        input.candidateId,
        interaction
      );

      // Check engagement level and trigger actions
      await this.checkEngagementLevel(input.candidateId);

      // Update pipeline if applicable
      if (input.pipelineStage) {
        await this.updatePipelineStage(
          input.candidateId,
          input.pipelineStage
        );
      }

      // Track interaction analytics
      await this.trackInteraction(interaction);

      return {
        success: true,
        interactionId: interaction._id,
        message: 'Interaction recorded successfully'
      };
    } catch (error) {
      this.logger.error('Error tracking candidate interaction:', error);
      throw error;
    }
  }

  async getCandidateEngagementMetrics(
    candidateId: string
  ): Promise<EngagementMetrics> {
    const cacheKey = `engagement:${candidateId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [candidate, interactions] = await Promise.all([
      this.candidateModel.findById(candidateId),
      this.interactionModel.find({
        candidateId,
        timestamp: {
          $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      })
    ]);

    const metrics = this.calculateEngagementMetrics(interactions);
    await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

    return metrics;
  }

  async updatePipelineStage(
    candidateId: string,
    stage: PipelineStage
  ): Promise<void> {
    try {
      const pipeline = await this.pipelineModel.findOneAndUpdate(
        { candidateId },
        {
          $push: {
            stages: {
              stage,
              timestamp: new Date()
            }
          },
          currentStage: stage,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Notify relevant parties
      await this.notifyPipelineUpdate(candidateId, stage);

      // Schedule follow-up actions
      await this.scheduleStageFollowUp(pipeline);
    } catch (error) {
      this.logger.error('Error updating pipeline stage:', error);
      throw error;
    }
  }

  async createEngagementPlan(
    input: EngagementPlanInput
  ): Promise<EngagementPlanResponse> {
    try {
      const candidate = await this.candidateModel.findById(input.candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const plan = {
        ...input,
        status: 'active',
        progress: 0,
        createdAt: new Date(),
        nextAction: this.determineNextAction(input.activities)
      };

      await this.candidateModel.findByIdAndUpdate(
        input.candidateId,
        {
          engagementPlan: plan,
          updatedAt: new Date()
        }
      );

      // Schedule initial activities
      await this.scheduleEngagementActivities(plan);

      return {
        success: true,
        candidateId: input.candidateId,
        message: 'Engagement plan created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating engagement plan:', error);
      throw error;
    }
  }

  private async updateCandidateLastInteraction(
    candidateId: string,
    interaction: any
  ): Promise<void> {
    await this.candidateModel.findByIdAndUpdate(
      candidateId,
      {
        lastInteraction: {
          type: interaction.type,
          timestamp: interaction.timestamp,
          details: interaction.details
        },
        updatedAt: new Date()
      }
    );

    // Invalidate cache
    await this.cacheService.delete(`engagement:${candidateId}`);
  }

  private async checkEngagementLevel(
    candidateId: string
  ): Promise<void> {
    const lastInteraction = await this.interactionModel.findOne(
      { candidateId },
      {},
      { sort: { timestamp: -1 } }
    );

    if (!lastInteraction) return;

    const daysSinceLastInteraction = Math.floor(
      (Date.now() - lastInteraction.timestamp.getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastInteraction >= this.ENGAGEMENT_THRESHOLD) {
      await this.triggerReengagementActions(candidateId);
    }
  }

  private async triggerReengagementActions(
    candidateId: string
  ): Promise<void> {
    const candidate = await this.candidateModel.findById(candidateId);

    // Send re-engagement email
    await this.emailService.sendTemplate({
      to: candidate.email,
      template: 'candidate-reengagement',
      data: {
        name: candidate.name,
        lastInteractionDate: candidate.lastInteraction.timestamp
      }
    });

    // Create notification for recruiter
    await this.notificationService.notify({
      type: 'CANDIDATE_REENGAGEMENT_NEEDED',
      userId: candidate.recruiterId,
      data: {
        candidateId,
        candidateName: candidate.name,
        daysSinceLastInteraction: this.ENGAGEMENT_THRESHOLD
      }
    });
  }

  private async notifyPipelineUpdate(
    candidateId: string,
    stage: PipelineStage
  ): Promise<void> {
    const candidate = await this.candidateModel.findById(candidateId);

    await this.notificationService.notify({
      type: 'PIPELINE_STAGE_UPDATE',
      userId: candidate.recruiterId,
      data: {
        candidateId,
        candidateName: candidate.name,
        stage,
        timestamp: new Date()
      }
    });
  }

  private async scheduleStageFollowUp(pipeline: any): Promise<void> {
    const followUpActions = {
      'initial_contact': { days: 2, template: 'initial-followup' },
      'interview_scheduled': { days: 1, template: 'interview-reminder' },
      'offer_extended': { days: 3, template: 'offer-followup' }
    };

    const action = followUpActions[pipeline.currentStage];
    if (action) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + action.days);

      await this.emailService.scheduleEmail({
        to: pipeline.candidate.email,
        template: action.template,
        data: {
          candidateName: pipeline.candidate.name,
          stage: pipeline.currentStage
        },
        sendAt: followUpDate
      });
    }
  }

  private calculateEngagementMetrics(
    interactions: any[]
  ): EngagementMetrics {
    const metrics: EngagementMetrics = {
      totalInteractions: interactions.length,
      interactionsByType: {},
      interactionsByMonth: {},
      averageResponseTime: 0,
      engagementScore: 0
    };

    interactions.forEach(interaction => {
      // Count by type
      metrics.interactionsByType[interaction.type] = 
        (metrics.interactionsByType[interaction.type] || 0) + 1;

      // Group by month
      const month = interaction.timestamp.toISOString().slice(0, 7);
      metrics.interactionsByMonth[month] = 
        (metrics.interactionsByMonth[month] || 0) + 1;
    });

    // Calculate average response time
    const responseTimes = interactions
      .filter(i => i.responseTime)
      .map(i => i.responseTime);
    
    if (responseTimes.length > 0) {
      metrics.averageResponseTime = 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Calculate engagement score (0-100)
    metrics.engagementScore = this.calculateEngagementScore(metrics);

    return metrics;
  }

  private calculateEngagementScore(metrics: EngagementMetrics): number {
    const weights = {
      interactionFrequency: 0.4,
      responseTime: 0.3,
      interactionDiversity: 0.3
    };

    const interactionFrequencyScore = 
      Math.min(metrics.totalInteractions / 10, 1) * 100;

    const responseTimeScore = metrics.averageResponseTime ?
      Math.max(0, 100 - (metrics.averageResponseTime / 3600) * 10) : 0;

    const interactionDiversity = 
      Object.keys(metrics.interactionsByType).length / 5;
    const diversityScore = Math.min(interactionDiversity, 1) * 100;

    return Math.round(
      interactionFrequencyScore * weights.interactionFrequency +
      responseTimeScore * weights.responseTime +
      diversityScore * weights.interactionDiversity
    );
  }

  private determineNextAction(
    activities: EngagementActivity[]
  ): EngagementActivity {
    return activities.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })[0];
  }

  private async scheduleEngagementActivities(
    plan: any
  ): Promise<void> {
    for (const activity of plan.activities) {
      if (activity.type === 'email') {
        await this.emailService.scheduleEmail({
          to: plan.candidate.email,
          template: activity.template,
          data: {
            candidateName: plan.candidate.name,
            ...activity.data
          },
          sendAt: new Date(activity.dueDate)
        });
      }

      await this.notificationService.scheduleNotification({
        type: 'ENGAGEMENT_ACTIVITY_DUE',
        userId: plan.recruiterId,
        data: {
          candidateId: plan.candidateId,
          activity
        },
        sendAt: new Date(activity.dueDate)
      });
    }
  }

  async createCandidate(
    input: CandidateInput
  ): Promise<CandidateResponse> {
    try {
      // Validate candidate data
      await this.validateCandidateData(input);

      // Check for duplicates
      await this.checkDuplicates(input);

      // Create candidate record
      const candidate = await this.candidateModel.create({
        ...input,
        status: 'new',
        createdAt: new Date()
      });

      // Initialize pipeline stage
      await this.initializePipelineStage(candidate);

      // Send welcome notification
      await this.notifyCandidate(candidate, 'welcome');

      // Track analytics
      await this.trackCandidateCreation(candidate);

      return {
        success: true,
        candidateId: candidate._id,
        message: 'Candidate created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating candidate:', error);
      throw error;
    }
  }

  async updateCandidateStatus(
    candidateId: string,
    input: StatusUpdateInput
  ): Promise<StatusUpdateResponse> {
    try {
      // Validate status transition
      await this.validateStatusTransition(candidateId, input.status);

      // Update candidate status
      const candidate = await this.candidateModel.findByIdAndUpdate(
        candidateId,
        {
          status: input.status,
          statusReason: input.reason,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Update pipeline stage
      await this.updatePipelineStage(candidate, input);

      // Send status notification
      await this.notifyStatusChange(candidate, input);

      // Track status change
      await this.trackStatusChange(candidate, input);

      return {
        success: true,
        candidateId,
        status: input.status,
        message: 'Status updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating candidate status:', error);
      throw error;
    }
  }

  async recordInteraction(
    input: InteractionInput
  ): Promise<InteractionResponse> {
    try {
      // Validate interaction data
      await this.validateInteraction(input);

      // Create interaction record
      const interaction = await this.interactionModel.create({
        ...input,
        timestamp: new Date()
      });

      // Update last interaction timestamp
      await this.updateLastInteraction(input.candidateId);

      // Check engagement level
      await this.checkEngagementLevel(input.candidateId);

      // Track interaction analytics
      await this.trackInteraction(interaction);

      return {
        success: true,
        interactionId: interaction._id,
        message: 'Interaction recorded successfully'
      };
    } catch (error) {
      this.logger.error('Error recording interaction:', error);
      throw error;
    }
  }

  async getCandidateInsights(
    candidateId: string
  ): Promise<CandidateInsights> {
    const cacheKey = `candidate:insights:${candidateId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const candidate = await this.candidateModel.findById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const insights = await this.generateCandidateInsights(candidate);
      await this.cacheService.set(cacheKey, insights, this.CACHE_TTL);

      return insights;
    } catch (error) {
      this.logger.error('Error getting candidate insights:', error);
      throw error;
    }
  }

  private async generateCandidateInsights(
    candidate: any
  ): Promise<CandidateInsights> {
    const [interactions, pipeline, analytics] = await Promise.all([
      this.getInteractionHistory(candidate._id),
      this.getPipelineProgress(candidate._id),
      this.getAnalytics(candidate._id)
    ]);

    return {
      overview: {
        daysInPipeline: this.calculateDaysInPipeline(candidate),
        currentStage: pipeline.currentStage,
        engagementLevel: this.calculateEngagementLevel(interactions),
        lastInteraction: interactions[0]?.timestamp
      },
      pipeline: {
        progress: pipeline.progress,
        timeInStages: pipeline.timeInStages,
        nextSteps: pipeline.nextSteps
      },
      interactions: {
        total: interactions.length,
        byType: this.groupInteractionsByType(interactions),
        timeline: this.generateInteractionTimeline(interactions)
      },
      analytics: {
        engagementScore: analytics.engagementScore,
        progressRate: analytics.progressRate,
        fitScore: analytics.fitScore
      }
    };
  }

  private async checkEngagementLevel(
    candidateId: string
  ): Promise<void> {
    const lastInteraction = await this.interactionModel.findOne(
      { candidateId },
      {},
      { sort: { timestamp: -1 } }
    );

    if (!lastInteraction) return;

    const daysSinceInteraction = this.calculateDaysSince(
      lastInteraction.timestamp
    );

    let engagementLevel: 'low' | 'medium' | 'high';
    if (daysSinceInteraction > this.ENGAGEMENT_THRESHOLDS.low) {
      engagementLevel = 'low';
    } else if (daysSinceInteraction > this.ENGAGEMENT_THRESHOLDS.medium) {
      engagementLevel = 'medium';
    } else {
      engagementLevel = 'high';
    }

    await this.updateEngagementLevel(candidateId, engagementLevel);
  }

  private calculateDaysSince(
    date: Date
  ): number {
    return Math.floor(
      (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
}

interface CandidateInteractionInput {
  candidateId: string;
  type: 'email' | 'call' | 'meeting' | 'message' | 'other';
  details: string;
  pipelineStage?: PipelineStage;
  outcome?: string;
  nextSteps?: string;
  responseTime?: number; // in seconds
}

type PipelineStage = 
  | 'initial_contact'
  | 'screening'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'assessment'
  | 'reference_check'
  | 'offer_extended'
  | 'offer_accepted'
  | 'onboarding';

interface InteractionResponse {
  success: boolean;
  interactionId: string;
  message: string;
}

interface EngagementMetrics {
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  interactionsByMonth: Record<string, number>;
  averageResponseTime: number;
  engagementScore: number;
}

interface EngagementPlanInput {
  candidateId: string;
  activities: EngagementActivity[];
  duration: number; // in days
  goals: string[];
}

interface EngagementActivity {
  type: 'email' | 'call' | 'meeting' | 'message';
  template?: string;
  dueDate: Date;
  priority: number;
  data?: Record<string, any>;
}

interface EngagementPlanResponse {
  success: boolean;
  candidateId: string;
  message: string;
}

interface CandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    graduationDate: Date;
  }>;
  preferences?: {
    jobTypes: string[];
    locations: string[];
    salary?: {
      min: number;
      max: number;
      currency: string;
    };
  };
}

interface CandidateResponse {
  success: boolean;
  candidateId: string;
  message: string;
}

interface StatusUpdateInput {
  status: string;
  reason?: string;
  metadata?: Record<string, any>;
}

interface StatusUpdateResponse {
  success: boolean;
  candidateId: string;
  status: string;
  message: string;
}

interface InteractionInput {
  candidateId: string;
  type: string;
  channel: string;
  notes?: string;
  outcome?: string;
  metadata?: Record<string, any>;
}

interface CandidateInsights {
  overview: {
    daysInPipeline: number;
    currentStage: string;
    engagementLevel: string;
    lastInteraction?: Date;
  };
  pipeline: {
    progress: number;
    timeInStages: Record<string, number>;
    nextSteps: Array<{
      action: string;
      dueDate?: Date;
      assignee?: string;
    }>;
  };
  interactions: {
    total: number;
    byType: Record<string, number>;
    timeline: Array<{
      timestamp: Date;
      type: string;
      details: string;
    }>;
  };
  analytics: {
    engagementScore: number;
    progressRate: number;
    fitScore: number;
  };
} 