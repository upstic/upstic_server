import { Availability, IAvailability, DayOfWeek, ShiftType } from '../models/Availability';
import { AppError } from '../middleware/errorHandler';
import { RedisService } from './redis.service';
import { Types } from 'mongoose';
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

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel('Availability') private availabilityModel: Model<IAvailability>,
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
    schedule: RegularScheduleDto[]
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          regularSchedule: schedule,
          lastUpdated: new Date()
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
    exception: AvailabilityExceptionDto
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $push: { exceptions: exception },
        $set: { lastUpdated: new Date() }
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
    preferences: UpdateAvailabilityDto
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      {
        $set: {
          preferences,
          lastUpdated: new Date()
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

    return regularSchedule.shifts.some(shift => shift.type === shiftType);
  }

  async getAvailableWorkers(
    startDate: Date,
    endDate: Date,
    requiredSkills?: string[],
    locations?: string[]
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

    const isAvailable = !existingTimesheet;
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
    }
  ): Promise<void> {
    const user = await User.findById(workerId);
    if (!user) {
      throw new AppError(404, 'Worker not found');
    }

    // Initialize preferences with required structure
    if (!user.preferences) {
      user.preferences = {
        availability: [],
        locations: [],
      };
    }

    // Add new availability
    user.preferences.availability.push({
      startDate: availability.startDate,
      endDate: availability.endDate,
      isAvailable: availability.isAvailable
    });

    await user.save();

    // Clear availability cache for this worker
    const cachePattern = `availability:${workerId}:*`;
    await this.redisService.clearCache(cachePattern);

    await this.notificationService.send(
      this.createNotification(
        workerId,
        AvailabilityNotificationType.SCHEDULE_UPDATE,
        'Availability Schedule Updated',
        `Your availability has been updated for ${availability.startDate.toLocaleDateString()} to ${availability.endDate.toLocaleDateString()}`,
        { availability }
      )
    );
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
    exceptionId: string
  ): Promise<IAvailability> {
    const availability = await this.availabilityModel.findOneAndUpdate(
      { workerId },
      { $pull: { exceptions: { _id: exceptionId } } },
      { new: true }
    );

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
      await this.notificationService.send(
        this.createNotification(
          workerId,
          AvailabilityNotificationType.AVAILABILITY_CONFLICT,
          'Schedule Conflict',
          `A scheduling conflict was detected between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`,
          { startDate, endDate }
        )
      );
    }

    return hasConflict;
  }

  private async checkForConflicts(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    // Implementation
    return false;
  }
} 