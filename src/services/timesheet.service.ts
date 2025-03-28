import { Timesheet, TimesheetStatus, ITimesheet, ITimeEntry, ClockEventType, PayPeriodType, IClockEvent } from '../models/Timesheet';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './notification.service';
import { FinancialService } from './financial.service';
import { uploadToS3 } from '../utils/s3';
import { Queue, QueueOptions } from 'bullmq';
import { DateTime } from 'luxon';
import { logger } from '../utils/logger';
import { Types, Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TimesheetNotificationType } from '../types/timesheet-notification.types';
import { INotification } from '../interfaces/notification.interface';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';

@Injectable()
export class TimesheetService {
  private static approvalQueue: Queue;
  private static readonly ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static notificationService: NotificationService;

  constructor(
    @InjectModel('Notification') private notificationModel: Model<INotification>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService
  ) {
    // Initialize the static notification service if not already initialized
    if (!TimesheetService.notificationService) {
      TimesheetService.notificationService = new NotificationService(
        notificationModel,
        emailService,
        redisService
      );
    }
  }

  static initialize() {
    try {
      const queueOptions: QueueOptions = {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      };
      
      this.approvalQueue = new Queue('timesheet-approvals', queueOptions);
    } catch (error) {
      logger.warn('Failed to initialize timesheet approval queue:', error);
    }
  }

  static async createTimesheet(
    workerId: string,
    jobId: string,
    weekStarting: Date,
    createdById: string,
    periodType: PayPeriodType = PayPeriodType.WEEKLY
  ): Promise<ITimesheet> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    // Validate week starting date
    const startDate = DateTime.fromJSDate(weekStarting).startOf('week');
    const endDate = startDate.plus({ days: 6 });

    // Check for existing timesheet
    const existingTimesheet = await Timesheet.findOne({
      workerId,
      jobId,
      weekStarting: startDate.toJSDate(),
      isDeleted: { $ne: true }
    });

    if (existingTimesheet) {
      return existingTimesheet;
    }

    // Create new timesheet
    const timesheet = new Timesheet({
      workerId,
      jobId,
      clientId: job.clientId,
      weekStarting: startDate.toJSDate(),
      weekEnding: endDate.toJSDate(),
      periodType,
      status: TimesheetStatus.DRAFT,
      timeEntries: [],
      createdBy: createdById,
      auditLogs: [{
        action: 'CREATE',
        performedBy: createdById,
        timestamp: new Date(),
        previousValue: null,
        newValue: { status: TimesheetStatus.DRAFT },
        notes: 'Timesheet created'
      }]
    });

    await timesheet.save();
    return timesheet;
  }

  static async addTimeEntry(
    timesheetId: string,
    entry: Partial<ITimeEntry>,
    userId: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Cannot add entries to a timesheet that is not in draft status');
    }

    if (!entry.date || !entry.startTime || !entry.endTime) {
      throw new AppError(400, 'Date, start time, and end time are required');
    }

    // Calculate hours based on job settings
    const hours = await this.calculateHours(timesheet.jobId.toString(), entry);

    const newEntry: ITimeEntry = {
      date: new Date(entry.date),
      startTime: new Date(entry.startTime),
      endTime: new Date(entry.endTime),
      breaks: entry.breaks || [],
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      holidayHours: hours.holidayHours,
      notes: entry.notes,
      clockEvents: entry.clockEvents || [],
      calculatedDuration: 0,
      manuallyAdjusted: false
    };

    // Calculate duration from clock events if available
    if (newEntry.clockEvents && newEntry.clockEvents.length > 0) {
      const duration = this.calculateDurationFromClockEvents(newEntry.clockEvents);
      newEntry.calculatedDuration = duration;
    }

    // Add the entry to the timesheet
    timesheet.timeEntries.push(newEntry);
    
    // Recalculate total hours
    this.recalculateTotalHours(timesheet);
    
    // Add audit log
    timesheet.auditLogs.push({
      action: 'ADD_ENTRY',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: null,
      newValue: newEntry,
      notes: 'Time entry added'
    });
    
    // Update the updatedBy field
    timesheet.updatedBy = userId;
    
    await timesheet.save();
    return timesheet;
  }

  static async recordClockEvent(
    timesheetId: string,
    timeEntryIndex: number,
    clockEvent: Partial<IClockEvent>,
    userId: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Cannot add clock events to a timesheet that is not in draft status');
    }

    if (!timesheet.timeEntries[timeEntryIndex]) {
      throw new AppError(404, 'Time entry not found');
    }

    if (!clockEvent.type || !clockEvent.timestamp) {
      throw new AppError(400, 'Clock event type and timestamp are required');
    }

    const newClockEvent: IClockEvent = {
      type: clockEvent.type,
      timestamp: new Date(clockEvent.timestamp),
      location: clockEvent.location,
      device: clockEvent.device,
      notes: clockEvent.notes,
      verified: false
    };

    // Initialize clockEvents array if it doesn't exist
    if (!timesheet.timeEntries[timeEntryIndex].clockEvents) {
      timesheet.timeEntries[timeEntryIndex].clockEvents = [];
    }

    // Add the clock event
    timesheet.timeEntries[timeEntryIndex].clockEvents!.push(newClockEvent);

    // Calculate duration from clock events
    const clockEvents = timesheet.timeEntries[timeEntryIndex].clockEvents || [];
    timesheet.timeEntries[timeEntryIndex].calculatedDuration = this.calculateDurationFromClockEvents(clockEvents);

    // Add audit log
    timesheet.auditLogs.push({
      action: 'CLOCK_EVENT',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: null,
      newValue: { timeEntryIndex, clockEvent: newClockEvent },
      notes: `${clockEvent.type} recorded`
    });

    // Update the updatedBy field
    timesheet.updatedBy = userId;

    await timesheet.save();
    return timesheet;
  }

  static async verifyClockEvent(
    timesheetId: string,
    timeEntryIndex: number,
    clockEventIndex: number,
    verifierId: string,
    verified: boolean,
    notes?: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    const timeEntry = timesheet.timeEntries[timeEntryIndex];
    if (!timeEntry) {
      throw new AppError(404, 'Time entry not found');
    }

    if (!timeEntry.clockEvents || !timeEntry.clockEvents[clockEventIndex]) {
      throw new AppError(404, 'Clock event not found');
    }

    const clockEvent = timeEntry.clockEvents[clockEventIndex];
    const previousValue = { verified: clockEvent.verified };

    // Update verification status
    clockEvent.verified = verified;
    clockEvent.verifiedBy = verifierId;
    clockEvent.verifiedAt = new Date();

    // Add audit log
    timesheet.auditLogs.push({
      action: 'VERIFY_CLOCK_EVENT',
      performedBy: verifierId,
      timestamp: new Date(),
      previousValue,
      newValue: { verified, notes },
      notes: `Clock event ${verified ? 'verified' : 'rejected'}`
    });

    // Update the updatedBy field
    timesheet.updatedBy = verifierId;

    await timesheet.save();
    return timesheet;
  }

  static async submitTimesheet(
    timesheetId: string,
    userId: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Only draft timesheets can be submitted');
    }

    if (!timesheet.timeEntries || timesheet.timeEntries.length === 0) {
      throw new AppError(400, 'Cannot submit an empty timesheet');
    }

    // Validate time entries
    this.validateTimeEntries(timesheet.timeEntries);

    // Update status
    const previousStatus = timesheet.status;
    timesheet.status = TimesheetStatus.SUBMITTED;
    timesheet.submittedBy = userId;
    timesheet.submittedAt = new Date();
    timesheet.updatedBy = userId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'SUBMIT',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: { status: previousStatus },
      newValue: { status: TimesheetStatus.SUBMITTED },
      notes: 'Timesheet submitted for approval'
    });

    await timesheet.save();

    // Queue for approval
    await this.queueForApproval(timesheet);

    // Send notification
    await this.notifySubmission(timesheet);

    return timesheet;
  }

  static async approveTimesheet(
    timesheetId: string,
    approverId: string,
    approverType: 'client' | 'manager',
    notes?: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new AppError(400, 'Only submitted timesheets can be approved');
    }

    // Update status
    const previousStatus = timesheet.status;
    timesheet.status = TimesheetStatus.APPROVED;
    timesheet.approvedBy = approverId;
    timesheet.approvedAt = new Date();
    timesheet.updatedBy = approverId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'APPROVE',
      performedBy: approverId,
      timestamp: new Date(),
      previousValue: { status: previousStatus },
      newValue: { status: TimesheetStatus.APPROVED, notes },
      notes: `Timesheet approved by ${approverType}`
    });

    await timesheet.save();

    // Send notification
    await this.notifyApproval(timesheet, approverType);

    return timesheet;
  }

  static async rejectTimesheet(
    timesheetId: string,
    rejecterId: string,
    reason: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new AppError(400, 'Only submitted timesheets can be rejected');
    }

    // Update status
    const previousStatus = timesheet.status;
    timesheet.status = TimesheetStatus.REJECTED;
    timesheet.rejectedBy = rejecterId;
    timesheet.rejectedAt = new Date();
    timesheet.rejectionReason = reason;
    timesheet.updatedBy = rejecterId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'REJECT',
      performedBy: rejecterId,
      timestamp: new Date(),
      previousValue: { status: previousStatus },
      newValue: { status: TimesheetStatus.REJECTED, reason },
      notes: 'Timesheet rejected'
    });

    await timesheet.save();

    // Send notification
    await this.notificationService.send({
      userId: timesheet.workerId.toString(),
      title: 'Timesheet Rejected',
      body: `Your timesheet for the week of ${DateTime.fromJSDate(timesheet.weekStarting).toFormat('MMM dd, yyyy')} has been rejected. Reason: ${reason}`,
      type: TimesheetNotificationType.TIMESHEET_REJECTED,
      data: { timesheetId: timesheet._id.toString() }
    });

    return timesheet;
  }

  static async softDeleteTimesheet(
    timesheetId: string,
    userId: string,
    reason?: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.isDeleted) {
      throw new AppError(400, 'Timesheet is already deleted');
    }

    // Mark as deleted
    timesheet.isDeleted = true;
    timesheet.deletedAt = new Date();
    timesheet.deletedBy = userId;
    timesheet.status = TimesheetStatus.DELETED;
    timesheet.updatedBy = userId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'DELETE',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: { isDeleted: false },
      newValue: { isDeleted: true, reason },
      notes: reason || 'Timesheet deleted'
    });

    await timesheet.save();
    return timesheet;
  }

  static async restoreTimesheet(
    timesheetId: string,
    userId: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (!timesheet.isDeleted) {
      throw new AppError(400, 'Timesheet is not deleted');
    }

    // Restore timesheet
    timesheet.isDeleted = false;
    timesheet.deletedAt = undefined;
    timesheet.deletedBy = undefined;
    timesheet.status = TimesheetStatus.DRAFT;
    timesheet.updatedBy = userId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'RESTORE',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: { isDeleted: true },
      newValue: { isDeleted: false },
      notes: 'Timesheet restored'
    });

    await timesheet.save();
    return timesheet;
  }

  static async addExpense(
    timesheetId: string,
    expense: {
      date: Date;
      type: string;
      amount: number;
      currency: string;
      notes?: string;
    },
    userId: string,
    receipt?: Express.Multer.File
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Cannot add expenses to a timesheet that is not in draft status');
    }

    let receiptUrl = '';
    if (receipt) {
      // Validate file
      if (!this.ALLOWED_FILE_TYPES.includes(receipt.mimetype)) {
        throw new AppError(400, 'Invalid file type. Allowed types: JPEG, PNG, PDF');
      }

      if (receipt.size > this.MAX_FILE_SIZE) {
        throw new AppError(400, 'File too large. Maximum size: 5MB');
      }

      // Upload to S3
      receiptUrl = await uploadToS3(receipt, `expenses/${timesheetId}/${Date.now()}-${receipt.originalname}`);
    }

    // Add expense
    const newExpense = {
      date: new Date(expense.date),
      type: expense.type,
      amount: expense.amount,
      currency: expense.currency,
      receipt: receiptUrl,
      approved: false,
      notes: expense.notes
    };

    if (!timesheet.expenses) {
      timesheet.expenses = [];
    }

    timesheet.expenses.push(newExpense);
    timesheet.updatedBy = userId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'ADD_EXPENSE',
      performedBy: userId,
      timestamp: new Date(),
      previousValue: null,
      newValue: newExpense,
      notes: 'Expense added'
    });

    await timesheet.save();
    return timesheet;
  }

  static async approveExpense(
    timesheetId: string,
    expenseIndex: number,
    approverId: string,
    approved: boolean,
    notes?: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (!timesheet.expenses || !timesheet.expenses[expenseIndex]) {
      throw new AppError(404, 'Expense not found');
    }

    const expense = timesheet.expenses[expenseIndex];
    const previousValue = { approved: expense.approved };

    // Update approval status
    expense.approved = approved;
    expense.approvedBy = approverId;
    expense.approvedAt = new Date();
    timesheet.updatedBy = approverId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'APPROVE_EXPENSE',
      performedBy: approverId,
      timestamp: new Date(),
      previousValue,
      newValue: { approved, notes },
      notes: `Expense ${approved ? 'approved' : 'rejected'}`
    });

    await timesheet.save();
    return timesheet;
  }

  static async markPayrollProcessed(
    timesheetId: string,
    payrollId: string,
    userId: string
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.APPROVED) {
      throw new AppError(400, 'Only approved timesheets can be marked as processed for payroll');
    }

    const previousValue = { 
      payrollProcessed: timesheet.payrollProcessed,
      payrollId: timesheet.payrollId
    };

    // Update payroll status
    timesheet.payrollProcessed = true;
    timesheet.payrollId = payrollId;
    timesheet.status = TimesheetStatus.PAID;
    timesheet.updatedBy = userId;

    // Add audit log
    timesheet.auditLogs.push({
      action: 'PAYROLL_PROCESSED',
      performedBy: userId,
      timestamp: new Date(),
      previousValue,
      newValue: { payrollProcessed: true, payrollId },
      notes: 'Timesheet processed for payroll'
    });

    await timesheet.save();
    return timesheet;
  }

  static async getTimesheetsByPeriod(
    periodCode: string,
    status?: TimesheetStatus[]
  ): Promise<ITimesheet[]> {
    const query: any = { 
      periodCode,
      isDeleted: { $ne: true }
    };

    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    return Timesheet.find(query)
      .populate('workerId', 'firstName lastName email')
      .populate('jobId', 'title location')
      .sort({ createdAt: -1 });
  }

  private static async calculateHours(
    jobId: string,
    entry: Partial<ITimeEntry>
  ): Promise<{ regularHours: number; overtimeHours: number; holidayHours: number }> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    // Default values
    const result = {
      regularHours: 0,
      overtimeHours: 0,
      holidayHours: 0
    };

    if (!entry.startTime || !entry.endTime) {
      return result;
    }

    const startTime = new Date(entry.startTime);
    const endTime = new Date(entry.endTime);

    // Calculate total duration in hours
    let totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Subtract break times
    if (entry.breaks && entry.breaks.length > 0) {
      const breakMinutes = entry.breaks.reduce((total, breakItem) => {
        if (!breakItem.paid && breakItem.duration) {
          return total + breakItem.duration;
        }
        return total;
      }, 0);
      totalHours -= breakMinutes / 60;
    }

    // Check if it's a holiday
    // This is a simplified check - in a real app, you'd check against a holiday calendar
    const isHoliday = false; // Placeholder for holiday check

    if (isHoliday) {
      result.holidayHours = totalHours;
    } else {
      // Check for overtime (simplified - in a real app, this would be more complex)
      const regularHoursLimit = 8; // Assuming 8 hours is regular time
      if (totalHours <= regularHoursLimit) {
        result.regularHours = totalHours;
      } else {
        result.regularHours = regularHoursLimit;
        result.overtimeHours = totalHours - regularHoursLimit;
      }
    }

    return result;
  }

  private static calculateTotalHours(
    entries: ITimeEntry[]
  ): { regular: number; overtime: number; holiday: number; total: number } {
    const result = {
      regular: 0,
      overtime: 0,
      holiday: 0,
      total: 0
    };

    entries.forEach(entry => {
      result.regular += entry.regularHours || 0;
      result.overtime += entry.overtimeHours || 0;
      result.holiday += entry.holidayHours || 0;
    });

    result.total = result.regular + result.overtime + result.holiday;
    return result;
  }

  private static recalculateTotalHours(timesheet: ITimesheet): void {
    const totals = this.calculateTotalHours(timesheet.timeEntries);
    timesheet.totalHours = totals;
  }

  private static calculateDurationFromClockEvents(
    clockEvents: IClockEvent[]
  ): number {
    if (!clockEvents || clockEvents.length < 2) {
      return 0;
    }

    // Sort clock events by timestamp
    const sortedEvents = [...clockEvents].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    let totalDuration = 0;
    let clockInTime: Date | null = null;
    let breakStartTime: Date | null = null;
    let breakDuration = 0;

    for (const event of sortedEvents) {
      if (event.type === ClockEventType.CLOCK_IN) {
        clockInTime = event.timestamp;
      } else if (event.type === ClockEventType.CLOCK_OUT && clockInTime) {
        const duration = (event.timestamp.getTime() - clockInTime.getTime()) / (1000 * 60); // in minutes
        totalDuration += duration - breakDuration;
        clockInTime = null;
        breakDuration = 0;
      } else if (event.type === ClockEventType.BREAK_START && clockInTime) {
        breakStartTime = event.timestamp;
      } else if (event.type === ClockEventType.BREAK_END && breakStartTime) {
        const breakTime = (event.timestamp.getTime() - breakStartTime.getTime()) / (1000 * 60); // in minutes
        breakDuration += breakTime;
        breakStartTime = null;
      }
    }

    return totalDuration;
  }

  private static validateTimeEntries(entries: ITimeEntry[]): void {
    if (entries.length === 0) {
      throw new AppError(400, 'Timesheet must have at least one time entry');
    }

    entries.forEach((entry, index) => {
      if (!entry.date || !entry.startTime || !entry.endTime) {
        throw new AppError(400, `Time entry at index ${index} is missing required fields`);
      }

      if (new Date(entry.startTime) >= new Date(entry.endTime)) {
        throw new AppError(400, `Time entry at index ${index} has invalid start/end times`);
      }
    });
  }

  private static async queueForApproval(timesheet: ITimesheet): Promise<void> {
    try {
      if (this.approvalQueue) {
        await this.approvalQueue.add('timesheet-approval', {
          timesheetId: timesheet._id.toString(),
          workerId: timesheet.workerId.toString(),
          clientId: timesheet.clientId,
          weekStarting: timesheet.weekStarting
        });
      } else {
        logger.warn('Approval queue not initialized, skipping queue');
      }
    } catch (error) {
      logger.error('Failed to queue timesheet for approval:', error);
    }
  }

  private static async notifySubmission(timesheet: ITimesheet): Promise<void> {
    try {
      // Notify worker
      await this.notificationService.send({
        userId: timesheet.workerId.toString(),
        title: 'Timesheet Submitted',
        body: `Your timesheet for the week of ${DateTime.fromJSDate(timesheet.weekStarting).toFormat('MMM dd, yyyy')} has been submitted for approval.`,
        type: TimesheetNotificationType.TIMESHEET_SUBMITTED,
        data: { timesheetId: timesheet._id.toString() }
      });

      // Notify client
      const client = await Client.findById(timesheet.clientId);
      if (client && client.userId) {
        await this.notificationService.send({
          userId: client.userId.toString(),
          title: 'Timesheet Submitted',
          body: `A timesheet has been submitted for approval for the week of ${DateTime.fromJSDate(timesheet.weekStarting).toFormat('MMM dd, yyyy')}.`,
          type: TimesheetNotificationType.TIMESHEET_SUBMITTED,
          data: { timesheetId: timesheet._id.toString() }
        });
      }
    } catch (error) {
      logger.error('Failed to send timesheet submission notification:', error);
    }
  }

  private static async notifyApproval(
    timesheet: ITimesheet,
    approverType: string
  ): Promise<void> {
    try {
      await this.notificationService.send({
        userId: timesheet.workerId.toString(),
        title: 'Timesheet Approved',
        body: `Your timesheet for the week of ${DateTime.fromJSDate(timesheet.weekStarting).toFormat('MMM dd, yyyy')} has been approved by ${approverType}.`,
        type: TimesheetNotificationType.TIMESHEET_APPROVED,
        data: { timesheetId: timesheet._id.toString() }
      });
    } catch (error) {
      logger.error('Failed to send timesheet approval notification:', error);
    }
  }

  private static hasRequiredApprovals(timesheet: ITimesheet): boolean {
    // In a real app, this would check for all required approvals
    // For now, we'll just check if it has been approved at all
    return !!timesheet.approvedBy;
  }
}

// Initialize the service
TimesheetService.initialize();