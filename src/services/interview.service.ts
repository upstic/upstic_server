import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IInterview } from '../interfaces/models.interface';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { 
  ScheduleInterviewDto, 
  RescheduleInterviewDto, 
  InterviewFeedbackDto 
} from '../dtos/interview.dto';
import { CalendarQueryDto } from '../dtos/calendar.dto';
import { Logger } from '../utils/logger';
import { NotificationType, NotificationPriority } from '../types/notification.types';

const logger = new Logger('InterviewService');

@Injectable()
export class InterviewService {
  constructor(
    @InjectModel('Interview') private interviewModel: Model<IInterview>,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService
  ) {}

  async scheduleInterview(data: ScheduleInterviewDto): Promise<IInterview> {
    try {
      const hasConflict = await this.checkSchedulingConflicts(
        data.scheduledAt,
        data.duration
      );

      if (hasConflict) {
        throw new Error('Scheduling conflict detected');
      }

      const interview = await this.interviewModel.create({
        ...data,
        status: 'scheduled'
      });

      await this.notifyParticipants(interview);
      return interview;
    } catch (error) {
      logger.error('Error scheduling interview:', error);
      throw error;
    }
  }

  async rescheduleInterview(id: string, data: RescheduleInterviewDto): Promise<IInterview> {
    try {
      const interview = await this.interviewModel.findById(id);
      if (!interview) {
        throw new Error('Interview not found');
      }

      const hasConflict = await this.checkSchedulingConflicts(
        data.scheduledAt,
        interview.duration
      );

      if (hasConflict) {
        throw new Error('Scheduling conflict detected');
      }

      interview.scheduledAt = new Date(data.scheduledAt);
      interview.reschedulingReason = data.reason;
      interview.status = 'rescheduled';

      await interview.save();
      await this.notifyRescheduling(interview);
      
      return interview;
    } catch (error) {
      logger.error('Error rescheduling interview:', error);
      throw error;
    }
  }

  async submitFeedback(id: string, data: InterviewFeedbackDto): Promise<IInterview> {
    try {
      const interview = await this.interviewModel.findById(id);
      if (!interview) {
        throw new Error('Interview not found');
      }

      interview.feedback = {
        ...data,
        submittedAt: new Date()
      };
      interview.status = 'completed';

      await interview.save();
      await this.notifyFeedbackSubmission(interview);
      
      return interview;
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      throw error;
    }
  }

  async getCalendar(query: CalendarQueryDto): Promise<IInterview[]> {
    try {
      const filter: any = {};

      if (query.startDate) {
        filter.scheduledAt = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        filter.scheduledAt = { ...filter.scheduledAt, $lte: new Date(query.endDate) };
      }
      if (query.type) {
        filter.type = query.type;
      }

      return this.interviewModel
        .find(filter)
        .sort({ scheduledAt: 1 })
        .exec();
    } catch (error) {
      logger.error('Error getting calendar:', error);
      throw error;
    }
  }

  private async checkSchedulingConflicts(
    scheduledAt: string | Date,
    duration: number
  ): Promise<boolean> {
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const conflictingInterviews = await this.interviewModel.findOne({
      scheduledAt: {
        $lt: endTime,
        $gt: startTime
      }
    });

    return !!conflictingInterviews;
  }

  private async notifyParticipants(interview: IInterview): Promise<void> {
    try {
      // Notify candidate
      await this.notificationService.send({
        userId: interview.candidateId,
        type: NotificationType.INTERVIEW_SCHEDULED,
        title: 'Interview Scheduled',
        body: `Your interview has been scheduled for ${new Date(interview.scheduledAt).toLocaleString()}`,
        data: {
          interviewId: interview._id,
          scheduledAt: interview.scheduledAt,
          type: interview.type,
          location: interview.location
        },
        priority: NotificationPriority.HIGH
      });

      // Notify interviewers
      for (const interviewerId of interview.interviewers) {
        await this.notificationService.send({
          userId: interviewerId,
          type: NotificationType.INTERVIEW_SCHEDULED,
          title: 'Interview Assignment',
          body: `You have been assigned to conduct an interview on ${new Date(interview.scheduledAt).toLocaleString()}`,
          data: {
            interviewId: interview._id,
            scheduledAt: interview.scheduledAt,
            type: interview.type,
            location: interview.location,
            candidateId: interview.candidateId
          },
          priority: NotificationPriority.HIGH
        });
      }

      // Send email notifications
      await this.emailService.sendInterviewScheduled(interview);
    } catch (error) {
      logger.error('Error notifying interview participants:', error);
      throw error;
    }
  }

  private async notifyRescheduling(interview: IInterview): Promise<void> {
    try {
      // Notify candidate
      await this.notificationService.send({
        userId: interview.candidateId,
        type: NotificationType.INTERVIEW_RESCHEDULED,
        title: 'Interview Rescheduled',
        body: `Your interview has been rescheduled to ${new Date(interview.scheduledAt).toLocaleString()}`,
        data: {
          interviewId: interview._id,
          scheduledAt: interview.scheduledAt,
          reason: interview.reschedulingReason
        },
        priority: NotificationPriority.HIGH
      });

      // Notify interviewers
      for (const interviewerId of interview.interviewers) {
        await this.notificationService.send({
          userId: interviewerId,
          type: NotificationType.INTERVIEW_RESCHEDULED,
          title: 'Interview Rescheduled',
          body: `The interview scheduled for ${new Date(interview.scheduledAt).toLocaleString()} has been rescheduled`,
          data: {
            interviewId: interview._id,
            scheduledAt: interview.scheduledAt,
            reason: interview.reschedulingReason,
            candidateId: interview.candidateId
          },
          priority: NotificationPriority.HIGH
        });
      }

      // Send email notifications
      await this.emailService.sendInterviewRescheduled(interview);
    } catch (error) {
      logger.error('Error notifying interview rescheduling:', error);
      throw error;
    }
  }

  private async notifyFeedbackSubmission(interview: IInterview): Promise<void> {
    try {
      // Notify hiring manager
      await this.notificationService.send({
        userId: interview.hiringManagerId,
        type: NotificationType.INTERVIEW_FEEDBACK,
        title: 'Interview Feedback Submitted',
        body: `Feedback has been submitted for the interview with ${interview.candidateName}`,
        data: {
          interviewId: interview._id,
          candidateId: interview.candidateId,
          feedback: {
            rating: interview.feedback.rating,
            skills: interview.feedback.skills
          }
        },
        priority: NotificationPriority.MEDIUM
      });

      // Notify recruiter
      if (interview.recruiterId) {
        await this.notificationService.send({
          userId: interview.recruiterId,
          type: NotificationType.INTERVIEW_FEEDBACK,
          title: 'Interview Feedback Submitted',
          body: `Feedback has been submitted for ${interview.candidateName}'s interview`,
          data: {
            interviewId: interview._id,
            candidateId: interview.candidateId,
            feedback: {
              rating: interview.feedback.rating,
              skills: interview.feedback.skills
            }
          },
          priority: NotificationPriority.MEDIUM
        });
      }

      // Send email notifications
      await this.emailService.sendInterviewFeedbackSubmitted(interview);
    } catch (error) {
      logger.error('Error notifying feedback submission:', error);
      throw error;
    }
  }
} 