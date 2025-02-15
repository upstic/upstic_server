import { Timesheet, TimesheetStatus, ITimesheet, ITimeEntry } from '../models/Timesheet';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { financialService } from './financial.service';
import { uploadToS3 } from '../utils/s3';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { logger } from '../utils/logger';

export class TimesheetService {
  private static approvalQueue: Queue;
  private static readonly ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  static initialize() {
    this.approvalQueue = new Queue('timesheet-approvals', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async createTimesheet(
    workerId: string,
    jobId: string,
    weekStarting: Date
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
      weekStarting: startDate.toJSDate()
    });

    if (existingTimesheet) {
      throw new AppError(400, 'Timesheet already exists for this week');
    }

    const timesheet = new Timesheet({
      workerId,
      jobId,
      clientId: job.clientId,
      weekStarting: startDate.toJSDate(),
      weekEnding: endDate.toJSDate(),
      status: TimesheetStatus.DRAFT,
      timeEntries: []
    });

    await timesheet.save();
    return timesheet;
  }

  static async addTimeEntry(
    timesheetId: string,
    entry: Partial<ITimeEntry>
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Cannot modify submitted timesheet');
    }

    // Validate entry date is within timesheet week
    const entryDate = DateTime.fromJSDate(entry.date!);
    const weekStart = DateTime.fromJSDate(timesheet.weekStarting);
    const weekEnd = DateTime.fromJSDate(timesheet.weekEnding);

    if (!entryDate.hasSame(weekStart, 'week')) {
      throw new AppError(400, 'Time entry date must be within timesheet week');
    }

    // Calculate hours
    const { regularHours, overtimeHours, holidayHours } = await this.calculateHours(
      timesheet.jobId,
      entry
    );

    const timeEntry: ITimeEntry = {
      ...entry,
      regularHours,
      overtimeHours,
      holidayHours
    } as ITimeEntry;

    // Update or add time entry
    const existingEntryIndex = timesheet.timeEntries.findIndex(
      e => e.date.getTime() === entry.date!.getTime()
    );

    if (existingEntryIndex >= 0) {
      timesheet.timeEntries[existingEntryIndex] = timeEntry;
    } else {
      timesheet.timeEntries.push(timeEntry);
    }

    // Recalculate totals
    timesheet.totalHours = this.calculateTotalHours(timesheet.timeEntries);
    timesheet.lastModifiedAt = new Date();

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
      throw new AppError(400, 'Timesheet already submitted');
    }

    if (timesheet.timeEntries.length === 0) {
      throw new AppError(400, 'Cannot submit empty timesheet');
    }

    // Validate all required entries
    this.validateTimeEntries(timesheet.timeEntries);

    timesheet.status = TimesheetStatus.SUBMITTED;
    timesheet.submittedAt = new Date();
    timesheet.submittedBy = userId;

    await timesheet.save();

    // Queue for approval
    await this.queueForApproval(timesheet);

    // Notify relevant parties
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
      throw new AppError(400, 'Timesheet not in submitted state');
    }

    // Add approval
    timesheet.approvals.push({
      type: approverType,
      approvedBy: approverId,
      approvedAt: new Date(),
      notes
    });

    // Check if all required approvals are complete
    if (this.hasRequiredApprovals(timesheet)) {
      timesheet.status = TimesheetStatus.APPROVED;
      
      // Trigger financial processing
      await financialService.processTimesheetPayment(timesheet);
    }

    await timesheet.save();

    // Notify relevant parties
    await this.notifyApproval(timesheet, approverType);

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
    receipt?: Express.Multer.File
  ): Promise<ITimesheet> {
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      throw new AppError(404, 'Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new AppError(400, 'Cannot modify submitted timesheet');
    }

    let receiptUrl: string | undefined;

    if (receipt) {
      // Validate receipt file
      if (!this.ALLOWED_FILE_TYPES.includes(receipt.mimetype)) {
        throw new AppError(400, 'Invalid file type');
      }
      if (receipt.size > this.MAX_FILE_SIZE) {
        throw new AppError(400, 'File size exceeds limit');
      }

      // Upload receipt
      receiptUrl = await uploadToS3(
        receipt,
        `expenses/${timesheetId}/${Date.now()}-${receipt.originalname}`
      );
    }

    timesheet.expenses = timesheet.expenses || [];
    timesheet.expenses.push({
      ...expense,
      receipt: receiptUrl,
      approved: false
    });

    timesheet.lastModifiedAt = new Date();
    await timesheet.save();

    return timesheet;
  }

  private static async calculateHours(
    jobId: string,
    entry: Partial<ITimeEntry>
  ): Promise<{ regularHours: number; overtimeHours: number; holidayHours: number }> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    // Calculate total duration excluding breaks
    const totalMinutes = DateTime.fromJSDate(entry.endTime!)
      .diff(DateTime.fromJSDate(entry.startTime!))
      .as('minutes');

    const breakMinutes = entry.breaks?.reduce(
      (total, breakEntry) => total + (breakEntry.paid ? 0 : breakEntry.duration),
      0
    ) || 0;

    const workMinutes = totalMinutes - breakMinutes;
    const workHours = workMinutes / 60;

    // Apply job-specific rules for regular/overtime/holiday hours
    // This is a simplified version - actual implementation would need to consider
    // various factors like local labor laws, client contracts, etc.
    return {
      regularHours: Math.min(workHours, 8),
      overtimeHours: Math.max(0, workHours - 8),
      holidayHours: 0 // Would need holiday calendar integration
    };
  }

  private static calculateTotalHours(
    entries: ITimeEntry[]
  ): { regular: number; overtime: number; holiday: number } {
    return entries.reduce(
      (totals, entry) => ({
        regular: totals.regular + entry.regularHours,
        overtime: totals.overtime + entry.overtimeHours,
        holiday: totals.holiday + entry.holidayHours
      }),
      { regular: 0, overtime: 0, holiday: 0 }
    );
  }

  private static validateTimeEntries(entries: ITimeEntry[]): void {
    // Implement validation logic
    // e.g., check for overlapping times, invalid durations, etc.
  }

  private static async queueForApproval(timesheet: ITimesheet): Promise<void> {
    await this.approvalQueue.add('process-approval', {
      timesheetId: timesheet._id,
      clientId: timesheet.clientId
    });
  }

  private static async notifySubmission(timesheet: ITimesheet): Promise<void> {
    const client = await Client.findById(timesheet.clientId);
    const worker = await User.findById(timesheet.workerId);

    await notificationService.send({
      userId: client!.managerId,
      title: 'Timesheet Submitted',
      body: `${worker!.name} has submitted a timesheet for approval`,
      type: 'TIMESHEET_SUBMITTED',
      data: { timesheetId: timesheet._id }
    });
  }

  private static async notifyApproval(
    timesheet: ITimesheet,
    approverType: string
  ): Promise<void> {
    await notificationService.send({
      userId: timesheet.workerId,
      title: 'Timesheet Update',
      body: `Your timesheet has been ${approverType} approved`,
      type: 'TIMESHEET_APPROVED',
      data: { timesheetId: timesheet._id }
    });
  }

  private static hasRequiredApprovals(timesheet: ITimesheet): boolean {
    const hasClientApproval = timesheet.approvals.some(a => a.type === 'client');
    const hasManagerApproval = timesheet.approvals.some(a => a.type === 'manager');
    return hasClientApproval && hasManagerApproval;
  }
}

// Initialize the service
TimesheetService.initialize();