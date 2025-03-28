import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
  Rating, 
  IRating, 
  RatingCategory, 
  RatingSource, 
  RatingStatus, 
  RatingVisibility,
  IRatingScore,
  IRatingResponse
} from '../models/Rating';
import { NotificationService } from './notification.service';
import { RatingNotificationType } from '../types/rating-notification.types';
import { INotification } from '../interfaces/notification.interface';
import { AppError } from '../middleware/errorHandler';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { logger } from '../utils/logger';

@Injectable()
export class RatingService {
  private static notificationService: NotificationService;

  constructor(
    @InjectModel('Rating') private ratingModel: Model<IRating>,
    @InjectModel('Notification') private notificationModel: Model<INotification>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService
  ) {
    if (!RatingService.notificationService) {
      RatingService.notificationService = new NotificationService(
        this.notificationModel,
        this.emailService,
        this.redisService
      );
    }
  }

  /**
   * Create a new rating
   */
  async createRating(
    ratingData: {
      scores: IRatingScore[];
      comment: string;
      jobId?: string;
      workerId?: string;
      clientId?: string;
      shiftId?: string;
      timesheetId?: string;
      source: RatingSource;
      visibility?: RatingVisibility;
      tags?: string[];
      improvementSuggestions?: string;
      strengths?: string[];
    },
    userId: string
  ): Promise<IRating> {
    try {
      // Validate that at least one entity ID is provided
      if (!ratingData.jobId && !ratingData.workerId && !ratingData.clientId && !ratingData.shiftId && !ratingData.timesheetId) {
        throw new AppError(400, 'At least one entity ID (job, worker, client, shift, or timesheet) must be provided');
      }

      // Validate scores
      if (!ratingData.scores || ratingData.scores.length === 0) {
        throw new AppError(400, 'At least one score is required');
      }

      // Create the rating
      const rating = new this.ratingModel({
        ...ratingData,
        ratedBy: userId,
        createdBy: userId,
        status: RatingStatus.PENDING
      });

      // Calculate average score
      rating.averageScore = rating.calculateAverageScore();

      // Save the rating
      await rating.save();

      // Send notifications
      await this.sendRatingNotifications(rating);

      return rating;
    } catch (error) {
      logger.error(`Error creating rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get a rating by ID
   */
  async getRatingById(ratingId: string): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }
      return rating;
    } catch (error) {
      logger.error(`Error getting rating by ID: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Update a rating
   */
  async updateRating(
    ratingId: string,
    updateData: {
      scores?: IRatingScore[];
      comment?: string;
      visibility?: RatingVisibility;
      tags?: string[];
      improvementSuggestions?: string;
      strengths?: string[];
    },
    userId: string
  ): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Check if user is authorized to update the rating
      if (rating.createdBy.toString() !== userId) {
        throw new AppError(403, 'Not authorized to update this rating');
      }

      // Update fields
      if (updateData.scores) {
        rating.scores = updateData.scores;
        rating.averageScore = rating.calculateAverageScore();
      }
      
      if (updateData.comment) {
        rating.comment = updateData.comment;
      }
      
      if (updateData.visibility) {
        rating.visibility = updateData.visibility;
      }
      
      if (updateData.tags) {
        rating.tags = updateData.tags;
      }
      
      if (updateData.improvementSuggestions) {
        rating.improvementSuggestions = updateData.improvementSuggestions;
      }
      
      if (updateData.strengths) {
        rating.strengths = updateData.strengths;
      }

      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      // Send notification about the update
      await RatingService.notificationService.sendNotification(
        rating.ratedBy.toString(),
        RatingNotificationType.RATING_UPDATED,
        {
          title: 'Rating Updated',
          body: `A rating you received has been updated.`,
          data: {
            ratingId: rating._id.toString(),
            averageScore: rating.averageScore
          }
        }
      );

      return rating;
    } catch (error) {
      logger.error(`Error updating rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Publish a rating (change status from PENDING to PUBLISHED)
   */
  async publishRating(ratingId: string, userId: string): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Check if user is authorized to publish the rating
      if (rating.createdBy.toString() !== userId) {
        throw new AppError(403, 'Not authorized to publish this rating');
      }

      // Update status
      rating.status = RatingStatus.PUBLISHED;
      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      // Send notification about the publication
      await RatingService.notificationService.sendNotification(
        rating.ratedBy.toString(),
        RatingNotificationType.RATING_PUBLISHED,
        {
          title: 'Rating Published',
          body: `A rating you received has been published.`,
          data: {
            ratingId: rating._id.toString(),
            averageScore: rating.averageScore
          }
        }
      );

      return rating;
    } catch (error) {
      logger.error(`Error publishing rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Dispute a rating
   */
  async disputeRating(ratingId: string, reason: string, userId: string): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Check if rating is disputable
      if (!rating.isDisputable()) {
        throw new AppError(400, 'This rating cannot be disputed');
      }

      // Update status
      rating.status = RatingStatus.DISPUTED;
      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      // Send notification about the dispute
      await RatingService.notificationService.sendNotification(
        rating.createdBy.toString(),
        RatingNotificationType.RATING_DISPUTED,
        {
          title: 'Rating Disputed',
          body: `A rating you gave has been disputed: ${reason}`,
          data: {
            ratingId: rating._id.toString(),
            reason
          }
        }
      );

      return rating;
    } catch (error) {
      logger.error(`Error disputing rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Resolve a disputed rating
   */
  async resolveDispute(
    ratingId: string, 
    resolution: {
      action: 'keep' | 'modify' | 'delete';
      modifiedScores?: IRatingScore[];
      modifiedComment?: string;
    },
    userId: string
  ): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Check if rating is disputed
      if (rating.status !== RatingStatus.DISPUTED) {
        throw new AppError(400, 'This rating is not disputed');
      }

      // Handle resolution based on action
      switch (resolution.action) {
        case 'keep':
          rating.status = RatingStatus.PUBLISHED;
          break;
        case 'modify':
          if (resolution.modifiedScores) {
            rating.scores = resolution.modifiedScores;
            rating.averageScore = rating.calculateAverageScore();
          }
          if (resolution.modifiedComment) {
            rating.comment = resolution.modifiedComment;
          }
          rating.status = RatingStatus.PUBLISHED;
          break;
        case 'delete':
          rating.status = RatingStatus.DELETED;
          break;
        default:
          throw new AppError(400, 'Invalid resolution action');
      }

      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      // Send notification about the resolution
      await RatingService.notificationService.sendNotification(
        rating.ratedBy.toString(),
        RatingNotificationType.RATING_DISPUTE_RESOLVED,
        {
          title: 'Rating Dispute Resolved',
          body: `A dispute for a rating you received has been resolved.`,
          data: {
            ratingId: rating._id.toString(),
            resolution: resolution.action
          }
        }
      );

      return rating;
    } catch (error) {
      logger.error(`Error resolving rating dispute: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Add a response to a rating
   */
  async addResponse(
    ratingId: string,
    responseData: {
      content: string;
      isPublic?: boolean;
    },
    userId: string
  ): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Create response
      const response: IRatingResponse = {
        content: responseData.content,
        respondedBy: new Types.ObjectId(userId),
        respondedAt: new Date(),
        isPublic: responseData.isPublic !== undefined ? responseData.isPublic : true
      };

      // Add response to rating
      rating.response = response;
      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      // Send notification about the response
      await RatingService.notificationService.sendNotification(
        rating.createdBy.toString(),
        RatingNotificationType.RATING_RESPONSE_ADDED,
        {
          title: 'Response to Your Rating',
          body: `Someone has responded to a rating you gave.`,
          data: {
            ratingId: rating._id.toString(),
            response: responseData.content
          }
        }
      );

      return rating;
    } catch (error) {
      logger.error(`Error adding response to rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Delete a rating (soft delete by changing status to DELETED)
   */
  async deleteRating(ratingId: string, userId: string): Promise<IRating> {
    try {
      const rating = await this.ratingModel.findById(ratingId);
      if (!rating) {
        throw new AppError(404, 'Rating not found');
      }

      // Check if user is authorized to delete the rating
      if (rating.createdBy.toString() !== userId) {
        throw new AppError(403, 'Not authorized to delete this rating');
      }

      // Update status
      rating.status = RatingStatus.DELETED;
      rating.updatedBy = new Types.ObjectId(userId);

      // Save the updated rating
      await rating.save();

      return rating;
    } catch (error) {
      logger.error(`Error deleting rating: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get ratings for an entity (worker, client, job, etc.)
   */
  async getRatingsForEntity(
    entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    entityId: string,
    options: {
      status?: RatingStatus;
      source?: RatingSource;
      minScore?: number;
      maxScore?: number;
      limit?: number;
      skip?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ ratings: IRating[]; total: number }> {
    try {
      const field = `${entityType}Id`;
      const query: any = { [field]: entityId };

      // Add filters
      if (options.status) {
        query.status = options.status;
      } else {
        // By default, only show published ratings
        query.status = RatingStatus.PUBLISHED;
      }

      if (options.source) {
        query.source = options.source;
      }

      if (options.minScore) {
        query.averageScore = { $gte: options.minScore };
      }

      if (options.maxScore) {
        query.averageScore = { ...query.averageScore, $lte: options.maxScore };
      }

      // Count total matching ratings
      const total = await this.ratingModel.countDocuments(query);

      // Build sort options
      const sortOptions: any = {};
      sortOptions[options.sortBy || 'createdAt'] = options.sortOrder === 'asc' ? 1 : -1;

      // Get ratings
      const ratings = await this.ratingModel
        .find(query)
        .sort(sortOptions)
        .skip(options.skip || 0)
        .limit(options.limit || 10);

      return { ratings, total };
    } catch (error) {
      logger.error(`Error getting ratings for entity: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get average rating for an entity
   */
  async getAverageRatingForEntity(
    entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    entityId: string
  ): Promise<number> {
    try {
      // Instead of using a static method on the model, we'll implement the aggregation here
      const field = `${entityType}Id`;
      const match: any = {};
      match[field] = entityId;
      match.status = RatingStatus.PUBLISHED;
      
      const result = await this.ratingModel.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          averageRating: { $avg: '$averageScore' }
        }}
      ]);
      
      return result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
    } catch (error) {
      logger.error(`Error getting average rating for entity: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Get rating statistics for an entity
   */
  async getRatingStatisticsForEntity(
    entityType: 'worker' | 'client' | 'job' | 'shift' | 'timesheet',
    entityId: string
  ): Promise<{
    averageScore: number;
    totalRatings: number;
    scoreDistribution: Record<number, number>;
    categoryAverages: Record<string, number>;
  }> {
    try {
      const field = `${entityType}Id`;
      const query: any = { 
        [field]: entityId,
        status: RatingStatus.PUBLISHED
      };

      // Get all published ratings for the entity
      const ratings = await this.ratingModel.find(query);

      // Calculate statistics
      const totalRatings = ratings.length;
      
      if (totalRatings === 0) {
        return {
          averageScore: 0,
          totalRatings: 0,
          scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          categoryAverages: {}
        };
      }

      // Calculate average score
      const averageScore = ratings.reduce((sum, rating) => sum + rating.averageScore, 0) / totalRatings;

      // Calculate score distribution
      const scoreDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(rating => {
        const roundedScore = Math.round(rating.averageScore);
        scoreDistribution[roundedScore] = (scoreDistribution[roundedScore] || 0) + 1;
      });

      // Calculate category averages
      const categoryScores: Record<string, { sum: number; count: number }> = {};
      
      ratings.forEach(rating => {
        rating.scores.forEach(score => {
          if (!categoryScores[score.category]) {
            categoryScores[score.category] = { sum: 0, count: 0 };
          }
          categoryScores[score.category].sum += score.score;
          categoryScores[score.category].count += 1;
        });
      });

      const categoryAverages: Record<string, number> = {};
      Object.entries(categoryScores).forEach(([category, { sum, count }]) => {
        categoryAverages[category] = Math.round((sum / count) * 10) / 10;
      });

      return {
        averageScore: Math.round(averageScore * 10) / 10,
        totalRatings,
        scoreDistribution,
        categoryAverages
      };
    } catch (error) {
      logger.error(`Error getting rating statistics for entity: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Send notifications for a new rating
   */
  private async sendRatingNotifications(rating: IRating): Promise<void> {
    try {
      // Determine who should receive the notification
      let recipientId: string | undefined;
      
      if (rating.workerId) {
        recipientId = rating.workerId.toString();
      } else if (rating.clientId) {
        recipientId = rating.clientId.toString();
      } else if (rating.jobId) {
        // For job ratings, we might need to look up the job owner
        // This is a placeholder - in a real implementation, you'd look up the job owner
        // recipientId = await this.getJobOwner(rating.jobId.toString());
      }

      if (recipientId) {
        await RatingService.notificationService.sendNotification(
          recipientId,
          RatingNotificationType.RATING_RECEIVED,
          {
            title: 'New Rating Received',
            body: `You've received a new ${rating.averageScore}/5 rating.`,
            data: {
              ratingId: rating._id.toString(),
              averageScore: rating.averageScore,
              source: rating.source
            }
          }
        );

        // Send low rating alert if average score is below 3
        if (rating.averageScore < 3) {
          await RatingService.notificationService.sendNotification(
            recipientId,
            RatingNotificationType.LOW_RATING_ALERT,
            {
              title: 'Low Rating Alert',
              body: `You've received a low rating of ${rating.averageScore}/5.`,
              data: {
                ratingId: rating._id.toString(),
                averageScore: rating.averageScore,
                source: rating.source
              }
            }
          );
        }

        // Send high rating alert if average score is 5
        if (rating.averageScore === 5) {
          await RatingService.notificationService.sendNotification(
            recipientId,
            RatingNotificationType.HIGH_RATING_ALERT,
            {
              title: 'Excellent Rating Received',
              body: `Congratulations! You've received a perfect 5/5 rating.`,
              data: {
                ratingId: rating._id.toString(),
                averageScore: rating.averageScore,
                source: rating.source
              }
            }
          );
        }
      }
    } catch (error) {
      logger.error(`Error sending rating notifications: ${error.message}`, { error });
      // Don't throw the error - just log it
    }
  }
} 