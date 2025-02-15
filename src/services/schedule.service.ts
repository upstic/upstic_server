import { Schedule, ScheduleStatus, RecurrenceType, ISchedule } from '../models/Schedule';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Branch } from '../models/Branch';
import { Job } from '../models/Job';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { validateShiftTiming } from '../utils/time-validator';
import { generateRecurringShifts } from '../utils/schedule-generator';
import { checkScheduleConflicts } from '../utils/conflict-checker';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';

export class ScheduleService {
  private static readonly MIN_SHIFT_HOURS = 2;
  private static readonly MAX_SHIFT_HOURS = 12;
  private static readonly MIN_SCHEDULE_NOTICE_HOURS = 24;

  static async createSchedule(
    workerId: string,
    clientId: string,
    userId: string,
    scheduleData: Partial<ISchedule>
  ): Promise<ISchedule> {
    const [worker, client, branch, job] = await Promise.all([
      User.findById(workerId),
      Client.findById(clientId),
      Branch.findById(scheduleData.branchId),
      Job.findById(scheduleData.jobId)
    ]);

    if (!worker || !client || !branch || !job) {
      throw new AppError(404, 'Worker, Client, Branch, or Job not found');
    }

    // Validate shifts
    await this.validateShifts(scheduleData.shifts || []);

    // Generate recurring shifts if applicable
    let shifts = scheduleData.shifts || [];
    if (scheduleData.recurrence?.type !== RecurrenceType.NONE) {
      shifts = await generateRecurringShifts(
        shifts[0],
        scheduleData.recurrence
      );
    }

    // Check for conflicts
    const conflicts = await checkScheduleConflicts(workerId, shifts);
    
    const schedule = new Schedule({
      ...scheduleData,
      workerId,
      clientId,
      shifts,
      conflicts,
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
        version: 1
      }
    });

    await schedule.save();

    // Notify worker if schedule is published
    if (schedule.status === ScheduleStatus.PUBLISHED) {
      await this.notifyScheduleCreation(schedule);
    }

    return schedule;
  }

  static async updateSchedule(
    scheduleId: string,
    userId: string,
    updates: Partial<ISchedule>
  ): Promise<ISchedule> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    // Validate shifts if updating
    if (updates.shifts) {
      await this.validateShifts(updates.shifts);
      
      // Check for conflicts with updated shifts
      const conflicts = await checkScheduleConflicts(
        schedule.workerId,
        updates.shifts,
        scheduleId
      );
      updates.conflicts = conflicts;
    }

    Object.assign(schedule, updates);
    schedule.metadata.lastModifiedBy = userId;
    schedule.metadata.lastModifiedAt = new Date();
    schedule.metadata.version += 1;

    await schedule.save();

    // Notify worker of updates
    await this.notifyScheduleUpdate(schedule);

    return schedule;
  }

  static async publishSchedule(
    scheduleId: string,
    userId: string
  ): Promise<ISchedule> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new AppError(400, 'Only draft schedules can be published');
    }

    // Validate schedule before publishing
    await this.validateScheduleForPublishing(schedule);

    schedule.status = ScheduleStatus.PUBLISHED;
    schedule.metadata.publishedBy = userId;
    schedule.metadata.publishedAt = new Date();
    schedule.metadata.lastModifiedBy = userId;
    schedule.metadata.lastModifiedAt = new Date();

    await schedule.save();

    // Notify worker
    await this.notifySchedulePublication(schedule);

    return schedule;
  }

  static async confirmShift(
    scheduleId: string,
    shiftIndex: number,
    userId: string
  ): Promise<ISchedule> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    if (!schedule.shifts[shiftIndex]) {
      throw new AppError(404, 'Shift not found');
    }

    schedule.shifts[shiftIndex].confirmed = true;
    schedule.metadata.lastModifiedBy = userId;
    schedule.metadata.lastModifiedAt = new Date();

    if (schedule.shifts.every(shift => shift.confirmed)) {
      schedule.status = ScheduleStatus.CONFIRMED;
    }

    await schedule.save();

    return schedule;
  }

  static async recordCheckIn(
    scheduleId: string,
    shiftIndex: number,
    userId: string
  ): Promise<ISchedule> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    const shift = schedule.shifts[shiftIndex];
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    if (!shift.confirmed) {
      throw new AppError(400, 'Shift must be confirmed before check-in');
    }

    shift.checkedIn = new Date();
    schedule.metadata.lastModifiedBy = userId;
    schedule.metadata.lastModifiedAt = new Date();
    schedule.status = ScheduleStatus.IN_PROGRESS;

    await schedule.save();

    return schedule;
  }

  static async recordCheckOut(
    scheduleId: string,
    shiftIndex: number,
    userId: string
  ): Promise<ISchedule> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new AppError(404, 'Schedule not found');
    }

    const shift = schedule.shifts[shiftIndex];
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    if (!shift.checkedIn) {
      throw new AppError(400, 'Must check-in before checking out');
    }

    shift.checkedOut = new Date();
    schedule.metadata.lastModifiedBy = userId;
    schedule.metadata.lastModifiedAt = new Date();

    if (schedule.shifts.every(s => s.checkedOut)) {
      schedule.status = ScheduleStatus.COMPLETED;
    }

    await schedule.save();

    return schedule;
  }

  private static async validateShifts(shifts: ISchedule['shifts']): Promise<void> {
    for (const shift of shifts) {
      const duration = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      
      if (duration < this.MIN_SHIFT_HOURS || duration > this.MAX_SHIFT_HOURS) {
        throw new AppError(400, `Shift duration must be between ${this.MIN_SHIFT_HOURS} and ${this.MAX_SHIFT_HOURS} hours`);
      }

      await validateShiftTiming(shift.startTime, shift.endTime);
    }
  }

  private static async validateScheduleForPublishing(schedule: ISchedule): Promise<void> {
    if (!schedule.shifts.length) {
      throw new AppError(400, 'Schedule must have at least one shift');
    }

    const now = new Date();
    const earliestShift = schedule.shifts.reduce(
      (earliest, shift) => shift.startTime < earliest ? shift.startTime : earliest,
      schedule.shifts[0].startTime
    );

    const noticeHours = (earliestShift.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (noticeHours < this.MIN_SCHEDULE_NOTICE_HOURS) {
      throw new AppError(400, `Schedule must be published at least ${this.MIN_SCHEDULE_NOTICE_HOURS} hours in advance`);
    }
  }

  private static async notifyScheduleCreation(schedule: ISchedule): Promise<void> {
    await notificationService.send({
      userId: schedule.workerId,
      title: 'New Schedule Created',
      body: `A new schedule has been created for your upcoming shifts`,
      type: 'SCHEDULE_CREATED',
      data: { scheduleId: schedule._id }
    });
  }

  private static async notifyScheduleUpdate(schedule: ISchedule): Promise<void> {
    await notificationService.send({
      userId: schedule.workerId,
      title: 'Schedule Updated',
      body: 'Your schedule has been updated',
      type: 'SCHEDULE_UPDATED',
      data: { scheduleId: schedule._id }
    });
  }

  private static async notifySchedulePublication(schedule: ISchedule): Promise<void> {
    await notificationService.send({
      userId: schedule.workerId,
      title: 'Schedule Published',
      body: 'Your schedule has been published and is ready for review',
      type: 'SCHEDULE_PUBLISHED',
      data: { scheduleId: schedule._id }
    });
  }
} 