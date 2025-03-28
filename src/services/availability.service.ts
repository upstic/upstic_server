import { Availability, IAvailability, DayOfWeek, ShiftType, RecurrencePattern, AvailabilityStatus } from '../models/Availability';
import { AppError } from '../middleware/errorHandler';
import { RedisService } from './redis.service';
import { Types, Document } from 'mongoose';
import { User } from '../models/User';
import { Timesheet } from '../models/Timesheet';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AvailabilityExceptionDto, UpdateAvailabilityDto, RegularScheduleDto } from '../dtos/availability.dto';
import { NotificationService } from './notification.service';
import { 
  AvailabilityNotificationType, 
  NotificationPayload,
  NotificationPriority 
} from '../types/notification.types';
import { logger } from '../utils/logger';

// Define an interface that includes the document methods
interface AvailabilityDocument extends IAvailability, Document {
  updateReliabilityMetrics(
    metric: 'shiftsCompleted' | 'shiftsAccepted' | 'shiftsRejected' | 'shiftsNoShow' | 'shiftsLate',
    increment?: number
  ): void;
}

// Define an interface for conflict details with _id
interface ConflictDetail {
  _id?: Types.ObjectId;
  conflictingShiftId?: string;
  conflictDate?: Date;
  conflictType?: string;
  resolved?: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel('Availability') private availabilityModel: Model<AvailabilityDocument>,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService
  ) {}

  async getWorkerAvailability(workerId: string): Promise<IAvailability> {
    const cacheKey = `availability:${workerId}`;
    const cachedAvailability = await this.redisService.get(cacheKey);
    
    if (cachedAvailability) {
      return cachedAvailability;
    }

    const availability = await this.availabilityModel.findOne({ workerId });
    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    await this.redisService.set(cacheKey, availability, 300); // Cache for 5 minutes
    return availability;
  }

  private createNotification(
    userId: string,
    type: AvailabilityNotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ): NotificationPayload {
    return {
      userId,
      type,
      title,
      body,
      data,
      priority: NotificationPriority.MEDIUM
    };
  }

  async updateRegularSchedule(
    workerId: string,
    schedule: RegularScheduleDto[],
    updatedBy?: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          regularSchedule: schedule,
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        }
      },
      { new: true, upsert: true }
    );

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.SCHEDULE_UPDATE,
        'Schedule Updated',
        'Your regular availability schedule has been updated',
        { scheduleId: availability._id }
      )
    );

    return availability;
  }

  async addException(
    workerId: string,
    exception: AvailabilityExceptionDto,
    updatedBy?: string
  ): Promise<IAvailability> {
    // Use isAvailable instead of available
    const status = exception.isAvailable ? 
      AvailabilityStatus.AVAILABLE : 
      AvailabilityStatus.UNAVAILABLE;

    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $push: { exceptions: { ...exception, status } },
        $set: { 
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        }
      },
      { new: true, upsert: true }
    );

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.EXCEPTION_ADDED,
        'Exception Added',
        `Availability exception added for ${exception.date.toLocaleDateString()}`,
        { date: exception.date }
      )
    );

    return availability;
  }

  async updatePreferences(
    workerId: string,
    preferences: UpdateAvailabilityDto,
    updatedBy?: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          preferences,
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        }
      },
      { new: true, upsert: true }
    );

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.PREFERENCES_UPDATE,
        'Preferences Updated',
        'Your availability preferences have been updated',
        { preferences }
      )
    );

    return availability;
  }

  async assignRecruiter(
    workerId: string,
    recruiterId: string,
    updatedBy: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          recruiterId: new Types.ObjectId(recruiterId),
          lastUpdated: new Date(),
          updatedBy: new Types.ObjectId(updatedBy)
        }
      },
      { new: true, upsert: true }
    );

    await this.redisService.del(`availability:${workerId}`);
    
    // Notify both worker and recruiter
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.RECRUITER_ASSIGNED,
        'Recruiter Assigned',
        'A recruiter has been assigned to manage your availability',
        { recruiterId }
      )
    );
    
    await this.notificationService.send(
      this.createNotification(
        recruiterId,
        AvailabilityNotificationType.WORKER_ASSIGNED,
        'Worker Assigned',
        'You have been assigned to manage a worker\'s availability',
        { workerId }
      )
    );

    return availability;
  }

  async updateReliabilityMetrics(
    workerId: string,
    metric: 'shiftsCompleted' | 'shiftsAccepted' | 'shiftsRejected' | 'shiftsNoShow' | 'shiftsLate',
    increment: number = 1
  ): Promise<void> {
    const availability = await this.availabilityModel.findOne({ workerId });
    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    availability.updateReliabilityMetrics(metric, increment);
    await availability.save();

    // Send notification about reliability update
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.RELIABILITY_UPDATE,
        'Reliability Score Updated',
        `Your reliability score has been updated based on recent activity.`,
        { workerId }
      )
    );
  }

  async recordConflict(
    workerId: string,
    conflictDetails: {
      conflictingShiftId?: string;
      conflictDate: Date;
      conflictType: string;
    },
    updatedBy?: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          'conflicts.detected': true,
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        },
        $push: {
          'conflicts.details': {
            ...conflictDetails,
            resolved: false
          }
        }
      },
      { new: true }
    );

    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    await this.redisService.del(`availability:${workerId}`);
    
    // Notify worker and recruiter about conflict
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.CONFLICT_DETECTED,
        'Availability Conflict Detected',
        `We've detected a potential conflict in your availability schedule.`,
        { conflictDetails }
      )
    );
    
    if (availability.recruiterId) {
      await this.notificationService.send(
        this.createNotification(
          availability.recruiterId.toString(),
          AvailabilityNotificationType.CONFLICT_DETECTED,
          'Worker Schedule Conflict',
          `A scheduling conflict has been detected for your worker on ${conflictDetails.conflictDate.toLocaleDateString()}`,
          { ...conflictDetails, workerId }
        )
      );
    }

    return availability;
  }

  async resolveConflict(
    workerId: string,
    conflictId: string,
    resolution: { action: string; notes?: string }
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOne({ workerId });
    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    // Find and update the specific conflict
    const conflictIndex = availability.conflicts?.details?.findIndex(
      (c: ConflictDetail) => c._id?.toString() === conflictId
    );

    if (conflictIndex === undefined || conflictIndex === -1) {
      throw new AppError(404, 'Conflict not found');
    }

    // Update the conflict
    if (availability.conflicts && availability.conflicts.details) {
      availability.conflicts.details[conflictIndex].resolved = true;
    }

    // No need to access updatedBy from resolution
    availability.lastUpdated = new Date();
    await availability.save();

    // Notify about resolution
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.CONFLICT_RESOLVED,
        'Availability Conflict Resolved',
        `An availability conflict has been resolved.`,
        { conflictId }
      )
    );

    return availability;
  }

  async checkAvailability(
    workerId: string,
    date: Date,
    shiftType: ShiftType
  ): Promise<boolean> {
    const availability = await this.getWorkerAvailability(workerId);
    
    // Check exceptions first
    const exception = availability.exceptions.find(
      e => e.date.toDateString() === date.toDateString()
    );
    
    if (exception) {
      if (!exception.available) return false;
      if (exception.shifts) {
        return exception.shifts.some(shift => shift.type === shiftType);
      }
    }

    // Check regular schedule
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
    const regularSchedule = availability.regularSchedule.find(
      schedule => schedule.dayOfWeek === dayOfWeek
    );

    if (!regularSchedule) return false;

    // Check if the schedule applies based on recurrence pattern
    if (regularSchedule.recurrencePattern) {
      const isApplicable = this.checkRecurrencePattern(
        date, 
        regularSchedule.recurrencePattern
      );
      if (!isApplicable) return false;
    }

    return regularSchedule.shifts.some(shift => shift.type === shiftType);
  }

  private checkRecurrencePattern(date: Date, pattern: RecurrencePattern): boolean {
    const today = new Date();
    const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (pattern) {
      case RecurrencePattern.DAILY:
        return true;
      case RecurrencePattern.WEEKLY:
        return daysDiff % 7 === 0;
      case RecurrencePattern.BIWEEKLY:
        return daysDiff % 14 === 0;
      case RecurrencePattern.MONTHLY:
        return date.getDate() === today.getDate();
      case RecurrencePattern.NONE:
        return false;
      case RecurrencePattern.CUSTOM:
        // Custom patterns would require additional logic
        return true;
      default:
        return true;
    }
  }

  async getAvailableWorkers(
    startDate: Date,
    endDate: Date,
    requiredSkills?: string[],
    locations?: string[],
    minReliabilityScore?: number
  ): Promise<string[]> {
    const query: any = {
      isActive: true,
      role: 'WORKER'
    };

    if (requiredSkills?.length) {
      query.skills = { $all: requiredSkills };
    }

    if (locations?.length) {
      query['preferences.locations'] = { $in: locations };
    }

    // Add reliability score filter if provided
    if (minReliabilityScore !== undefined) {
      query['reliability.score'] = { $gte: minReliabilityScore };
    }

    const workers = await User.find(query);
    const availableWorkerIds = await Promise.all(
      workers.map(async worker => {
        const isAvailable = await this.checkWorkerAvailability(
          worker._id.toString(),
          startDate,
          endDate
        );
        return isAvailable ? worker._id.toString() : null;
      })
    );

    return availableWorkerIds.filter((id): id is string => id !== null);
  }

  async checkWorkerAvailability(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const cacheKey = `availability:${workerId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cachedResult = await this.redisService.get(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Check existing assignments
    const existingTimesheet = await Timesheet.findOne({
      workerId,
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        }
      ]
    });

    // Check if there are any conflicts already recorded
    const availability = await this.availabilityModel.findOne({ 
      workerId,
      'conflicts.detected': true,
      'conflicts.details.conflictDate': { 
        $gte: startDate,
        $lte: endDate
      },
      'conflicts.details.resolved': false
    });

    const hasConflict = !!existingTimesheet || !!availability;
    const isAvailable = !hasConflict;
    
    await this.redisService.set(cacheKey, isAvailable, 300); // Cache for 5 minutes

    if (!isAvailable) {
      await this.notificationService.send(
        this.createNotification(
          workerId,
          AvailabilityNotificationType.AVAILABILITY_CONFLICT,
          'Availability Conflict',
          `Schedule conflict detected between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`,
          { startDate, endDate }
        )
      );
    }

    return isAvailable;
  }

  async updateWorkerAvailability(
    workerId: string,
    availability: {
      startDate: Date;
      endDate: Date;
      isAvailable: boolean;
      recurrencePattern?: RecurrencePattern;
      specialNotes?: string;
    },
    updatedBy?: string
  ): Promise<void> {
    const user = await User.findById(workerId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Initialize preferences if they don't exist
    if (!user.preferences) {
      user.preferences = {
        availability: [],
        locations: []
      };
    }

    // Initialize availability array if it doesn't exist
    if (!user.preferences.availability) {
      user.preferences.availability = [];
    }

    // Add new availability
    user.preferences.availability.push({
      startDate: availability.startDate,
      endDate: availability.endDate,
      isAvailable: availability.isAvailable
    });

    await user.save();

    // Clear availability cache for this worker
    try {
      const cachePattern = `availability:${workerId}:*`;
      await this.redisService.del(cachePattern);
    } catch (error) {
      logger.warn(`Failed to delete Redis cache pattern: ${error.message}`);
    }

    // Notify worker about the update
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.SCHEDULE_UPDATE,
        'Availability Updated',
        `Your availability has been updated for ${availability.startDate.toLocaleDateString()} - ${availability.endDate.toLocaleDateString()}`,
        { availability }
      )
    );

    // Create exception if needed
    if (availability.isAvailable) {
      await this.createAvailabilityException(
        workerId,
        {
          date: availability.startDate,
          isAvailable: true,
          reason: availability.specialNotes
        }
      );
    } else {
      await this.createAvailabilityException(
        workerId,
        {
          date: availability.startDate,
          isAvailable: false,
          reason: availability.specialNotes
        }
      );
    }
  }

  async update(workerId: string, data: any) {
    return await this.availabilityModel.findByIdAndUpdate(workerId, data, { new: true });
  }

  async get(workerId: string, options?: any) {
    return await this.getWorkerAvailability(workerId);
  }

  async getExceptions(workerId: string, options?: any) {
    const availability = await this.getWorkerAvailability(workerId);
    return availability.exceptions;
  }

  async deleteException(
    workerId: string,
    exceptionId: string,
    updatedBy?: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      { 
        $pull: { exceptions: { _id: exceptionId } },
        $set: { 
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        }
      },
      { new: true }
    );

    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.EXCEPTION_DELETED,
        'Exception Removed',
        'An availability exception has been removed from your schedule',
        { exceptionId }
      )
    );

    return availability;
  }

  async checkAvailabilityConflict(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const hasConflict = await this.checkForConflicts(workerId, startDate, endDate);
    
    if (hasConflict) {
      // Record the conflict in the availability model
      await this.recordConflict(
        workerId,
        {
          conflictDate: startDate,
          conflictType: 'schedule_overlap'
        }
      );
      
      return true;
    }
    
    return false;
  }

  private async checkForConflicts(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const existingTimesheet = await Timesheet.findOne({
      workerId,
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        }
      ]
    });

    return !!existingTimesheet;
  }

  async addAvailabilityException(
    workerId: string,
    exception: AvailabilityExceptionDto,
    updatedBy?: string
  ): Promise<IAvailability> {
    // Add status if not provided
    const status = exception.isAvailable ? 
      AvailabilityStatus.AVAILABLE : 
      AvailabilityStatus.UNAVAILABLE;

    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $push: { exceptions: exception },
        $set: { 
          lastUpdated: new Date(),
          updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined
        }
      },
      { new: true, upsert: true }
    );

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.EXCEPTION_ADDED,
        'Exception Added',
        `Availability exception added for ${exception.date.toLocaleDateString()}`,
        { date: exception.date }
      )
    );

    return availability;
  }

  async createAvailabilityException(workerId: string, exceptionData: AvailabilityExceptionDto): Promise<IAvailability> {
    const exception = {
      date: exceptionData.date,
      isAvailable: exceptionData.isAvailable,
      shifts: exceptionData.shifts,
      reason: exceptionData.reason
    };

    return await this.addAvailabilityException(workerId, exceptionData);
  }

  async deleteAvailabilityException(workerId: string, exceptionId: string): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      { 
        $pull: { exceptions: { _id: exceptionId } },
        $set: { 
          lastUpdated: new Date(),
          updatedBy: undefined
        }
      },
      { new: true }
    );

    if (!availability) {
      throw new AppError(404, 'Availability not found');
    }

    await this.redisService.del(`availability:${workerId}`);
    
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.EXCEPTION_DELETED,
        'Exception Removed',
        'An availability exception has been removed from your schedule',
        { exceptionId }
      )
    );

    // Use pattern-based deletion if Redis is available
    try {
      const cacheKey = `availability:${workerId}:exceptions:*`;
      await this.redisService.del(cacheKey);
    } catch (error) {
      logger.warn(`Failed to delete Redis cache for availability exceptions: ${error.message}`);
    }

    return availability;
  }

  async detectConflicts(workerId: string): Promise<any[]> {
    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.CONFLICT_DETECTED,
        'Availability Conflict Detected',
        `We've detected a potential conflict in your availability schedule.`,
        { workerId }
      )
    );

    const conflicts = await this.availabilityModel.find({
      'conflicts.detected': true,
      'conflicts.details.resolved': false
    });

    return conflicts.map(conflict => ({
      conflictId: conflict._id,
      conflictDate: conflict.conflicts?.details?.[0]?.conflictDate,
      conflictType: conflict.conflicts?.details?.[0]?.conflictType
    }));
  }
} 