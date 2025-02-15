import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class AvailabilityManager {
  constructor(
    @InjectModel('Availability') private availabilityModel: Model<any>,
    @InjectModel('Worker') private workerModel: Model<any>,
    private cacheService: CacheService,
    private notificationService: NotificationService,
    private logger: Logger
  ) {}

  async setAvailability(
    workerId: string,
    availability: AvailabilityInput
  ): Promise<AvailabilityResponse> {
    try {
      // Validate availability times
      this.validateAvailabilityTimes(availability);

      // Check for existing commitments
      await this.checkExistingCommitments(workerId, availability);

      // Store availability
      const availabilityRecord = await this.availabilityModel.create({
        workerId,
        ...availability,
        status: 'active',
        createdAt: new Date()
      });

      // Update cache
      await this.updateAvailabilityCache(workerId);

      // Notify relevant services
      await this.notifyAvailabilityUpdate(workerId, availabilityRecord);

      return {
        success: true,
        availabilityId: availabilityRecord._id,
        message: 'Availability set successfully'
      };
    } catch (error) {
      this.logger.error('Error setting availability:', error);
      throw error;
    }
  }

  async getWorkerAvailability(
    workerId: string,
    dateRange: DateRange
  ): Promise<AvailabilitySchedule> {
    const cached = await this.cacheService.get(`availability:${workerId}`);
    if (cached) return cached;

    const availability = await this.availabilityModel.find({
      workerId,
      startDate: { $lte: dateRange.endDate },
      endDate: { $gte: dateRange.startDate },
      status: 'active'
    });

    const schedule = this.processAvailabilityRecords(availability);
    await this.cacheService.set(`availability:${workerId}`, schedule, 3600);

    return schedule;
  }

  async updateRecurringAvailability(
    workerId: string,
    pattern: RecurringPattern
  ): Promise<void> {
    const recurringSchedule = this.generateRecurringSchedule(pattern);
    await this.availabilityModel.updateMany(
      { workerId, isRecurring: true },
      { $set: { status: 'inactive' } }
    );

    await Promise.all(
      recurringSchedule.map(slot => 
        this.setAvailability(workerId, slot)
      )
    );
  }

  private validateAvailabilityTimes(availability: AvailabilityInput): void {
    const { startDate, endDate, shifts } = availability;

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }

    shifts.forEach(shift => {
      if (shift.startTime > shift.endTime) {
        throw new Error('Shift start time must be before end time');
      }
    });
  }

  private async checkExistingCommitments(
    workerId: string,
    availability: AvailabilityInput
  ): Promise<void> {
    const conflicts = await this.availabilityModel.find({
      workerId,
      status: 'active',
      $or: [
        {
          startDate: { $lte: availability.startDate },
          endDate: { $gte: availability.startDate }
        },
        {
          startDate: { $lte: availability.endDate },
          endDate: { $gte: availability.endDate }
        }
      ]
    });

    if (conflicts.length > 0) {
      throw new Error('Availability conflicts with existing commitments');
    }
  }

  private async updateAvailabilityCache(workerId: string): Promise<void> {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const availability = await this.getWorkerAvailability(workerId, {
      startDate: new Date(),
      endDate: nextMonth
    });

    await this.cacheService.set(
      `availability:${workerId}`,
      availability,
      3600
    );
  }

  private async notifyAvailabilityUpdate(
    workerId: string,
    availability: any
  ): Promise<void> {
    await this.notificationService.notify({
      type: 'AVAILABILITY_UPDATE',
      userId: workerId,
      data: {
        availabilityId: availability._id,
        startDate: availability.startDate,
        endDate: availability.endDate
      }
    });
  }

  private processAvailabilityRecords(
    records: any[]
  ): AvailabilitySchedule {
    const schedule: AvailabilitySchedule = {
      regularHours: [],
      exceptions: [],
      preferences: {}
    };

    records.forEach(record => {
      if (record.isRecurring) {
        schedule.regularHours.push({
          dayOfWeek: record.dayOfWeek,
          shifts: record.shifts
        });
      } else {
        schedule.exceptions.push({
          date: record.startDate,
          shifts: record.shifts
        });
      }
    });

    return schedule;
  }

  private generateRecurringSchedule(
    pattern: RecurringPattern
  ): AvailabilityInput[] {
    const schedule: AvailabilityInput[] = [];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    pattern.days.forEach(day => {
      schedule.push({
        startDate: startDate,
        endDate: endDate,
        shifts: pattern.shifts,
        isRecurring: true,
        dayOfWeek: day,
        preferences: pattern.preferences
      });
    });

    return schedule;
  }
}

interface AvailabilityInput {
  startDate: Date;
  endDate: Date;
  shifts: Array<{
    startTime: string;
    endTime: string;
    type?: string;
  }>;
  isRecurring?: boolean;
  dayOfWeek?: number;
  preferences?: {
    maxHoursPerDay?: number;
    preferredShiftTypes?: string[];
    locationPreferences?: string[];
  };
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AvailabilityResponse {
  success: boolean;
  availabilityId: string;
  message: string;
}

interface AvailabilitySchedule {
  regularHours: Array<{
    dayOfWeek: number;
    shifts: Array<{
      startTime: string;
      endTime: string;
      type?: string;
    }>;
  }>;
  exceptions: Array<{
    date: Date;
    shifts: Array<{
      startTime: string;
      endTime: string;
      type?: string;
    }>;
  }>;
  preferences: {
    maxHoursPerDay?: number;
    preferredShiftTypes?: string[];
    locationPreferences?: string[];
  };
}

interface RecurringPattern {
  days: number[];
  shifts: Array<{
    startTime: string;
    endTime: string;
    type?: string;
  }>;
  preferences?: {
    maxHoursPerDay?: number;
    preferredShiftTypes?: string[];
    locationPreferences?: string[];
  };
} 