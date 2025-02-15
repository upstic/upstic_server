import { Shift, ShiftStatus, ShiftPriority, IShift } from '../models/Shift';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Branch } from '../models/Branch';
import { Job } from '../models/Job';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { matchingService } from './matching.service';
import { geocodeAddress } from '../utils/geocoding';
import { validateShiftTiming } from '../utils/time-validator';
import { calculateShiftCost } from '../utils/cost-calculator';
import { sanitizeHtml } from '../utils/sanitizer';
import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

export class ShiftService {
  private static matchingQueue: Queue;
  private static readonly MIN_SHIFT_DURATION = 60; // 1 hour in minutes
  private static readonly MAX_SHIFT_DURATION = 720; // 12 hours in minutes
  private static readonly ADVANCE_NOTICE_HOURS = 2;

  static initialize() {
    this.matchingQueue = new Queue('shift-matching', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async createShift(
    clientId: string,
    userId: string,
    shiftData: Partial<IShift>
  ): Promise<IShift> {
    const [client, branch, job] = await Promise.all([
      Client.findById(clientId),
      Branch.findById(shiftData.branchId),
      Job.findById(shiftData.jobId)
    ]);

    if (!client || !branch || !job) {
      throw new AppError(404, 'Client, Branch, or Job not found');
    }

    // Validate shift timing
    await this.validateShiftCreation(shiftData);

    // Calculate duration
    const duration = Math.floor(
      (shiftData.endTime!.getTime() - shiftData.startTime!.getTime()) / (1000 * 60)
    );

    // Geocode location if address provided
    if (shiftData.location?.address) {
      const coordinates = await geocodeAddress(
        shiftData.location.address,
        branch.address.city,
        branch.address.country
      );
      if (coordinates) {
        shiftData.location.coordinates = coordinates;
      }
    }

    // Sanitize input
    const sanitizedData = this.sanitizeShiftData(shiftData);

    const shift = new Shift({
      ...sanitizedData,
      clientId,
      duration,
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
        version: 1
      }
    });

    await shift.save();

    // If auto-assign is enabled, queue matching process
    if (shift.preferences.autoAssign) {
      await this.queueShiftMatching(shift);
    }

    return shift;
  }

  static async publishShift(
    shiftId: string,
    userId: string
  ): Promise<IShift> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    if (shift.status !== ShiftStatus.DRAFT) {
      throw new AppError(400, 'Only draft shifts can be published');
    }

    // Validate shift before publishing
    await this.validateShiftPublishing(shift);

    shift.status = ShiftStatus.PUBLISHED;
    shift.metadata.publishedBy = userId;
    shift.metadata.publishedAt = new Date();
    shift.metadata.lastModifiedBy = userId;
    shift.metadata.lastModifiedAt = new Date();

    await shift.save();

    // Notify matching workers
    await this.notifyMatchingWorkers(shift);

    return shift;
  }

  static async assignWorker(
    shiftId: string,
    workerId: string,
    assignerId: string
  ): Promise<IShift> {
    const [shift, worker] = await Promise.all([
      Shift.findById(shiftId),
      User.findById(workerId)
    ]);

    if (!shift || !worker) {
      throw new AppError(404, 'Shift or Worker not found');
    }

    if (shift.status !== ShiftStatus.PUBLISHED) {
      throw new AppError(400, 'Cannot assign workers to unpublished shifts');
    }

    // Check if worker is already assigned
    if (shift.assignments.some(a => a.workerId === workerId)) {
      throw new AppError(400, 'Worker already assigned to this shift');
    }

    // Check maximum workers limit
    if (shift.assignments.length >= shift.preferences.maxWorkers) {
      throw new AppError(400, 'Maximum workers limit reached for this shift');
    }

    // Validate worker availability
    await this.validateWorkerAvailability(workerId, shift);

    shift.assignments.push({
      workerId,
      status: 'pending',
      assignedAt: new Date()
    });

    if (shift.assignments.length >= shift.preferences.minWorkers) {
      shift.status = ShiftStatus.ASSIGNED;
    }

    await shift.save();

    // Notify worker of assignment
    await notificationService.send({
      userId: workerId,
      title: 'New Shift Assignment',
      body: `You have been assigned to ${shift.title}`,
      type: 'SHIFT_ASSIGNMENT',
      data: { shiftId: shift._id }
    });

    return shift;
  }

  static async updateShiftStatus(
    shiftId: string,
    workerId: string,
    status: 'accepted' | 'rejected' | 'cancelled',
    reason?: string
  ): Promise<IShift> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    const assignment = shift.assignments.find(a => a.workerId === workerId);
    if (!assignment) {
      throw new AppError(404, 'Worker not assigned to this shift');
    }

    assignment.status = status;
    assignment.respondedAt = new Date();

    if (status === 'rejected' || status === 'cancelled') {
      // Check if minimum workers requirement is still met
      const activeAssignments = shift.assignments.filter(
        a => a.status === 'accepted'
      );
      if (activeAssignments.length < shift.preferences.minWorkers) {
        shift.status = ShiftStatus.PUBLISHED;
      }
    }

    await shift.save();

    // Notify relevant parties
    await this.notifyStatusUpdate(shift, workerId, status);

    return shift;
  }

  static async startShift(
    shiftId: string,
    workerId: string
  ): Promise<IShift> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    const assignment = shift.assignments.find(
      a => a.workerId === workerId && a.status === 'accepted'
    );
    if (!assignment) {
      throw new AppError(404, 'No active assignment found for worker');
    }

    assignment.startedAt = new Date();
    shift.status = ShiftStatus.IN_PROGRESS;

    await shift.save();

    return shift;
  }

  static async completeShift(
    shiftId: string,
    workerId: string,
    completionData: {
      rating?: number;
      feedback?: string;
      checklist?: Array<{
        task: string;
        completed: boolean;
        notes?: string;
      }>;
    }
  ): Promise<IShift> {
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    const assignment = shift.assignments.find(
      a => a.workerId === workerId && a.status === 'accepted'
    );
    if (!assignment) {
      throw new AppError(404, 'No active assignment found for worker');
    }

    assignment.completedAt = new Date();
    if (completionData.rating) {
      assignment.rating = completionData.rating;
    }
    if (completionData.feedback) {
      assignment.feedback = sanitizeHtml(completionData.feedback);
    }

    // Update checklist if provided
    if (completionData.checklist) {
      shift.checklist = shift.checklist?.map(item => {
        const update = completionData.checklist?.find(c => c.task === item.task);
        if (update) {
          return {
            ...item,
            completed: update.completed,
            completedBy: workerId,
            completedAt: new Date(),
            notes: update.notes
          };
        }
        return item;
      });
    }

    // Check if all assigned workers have completed
    const allCompleted = shift.assignments.every(
      a => a.status === 'accepted' && a.completedAt
    );
    if (allCompleted) {
      shift.status = ShiftStatus.COMPLETED;
    }

    await shift.save();

    // Notify completion
    await this.notifyShiftCompletion(shift, workerId);

    return shift;
  }

  static async searchShifts(
    criteria: {
      clientId?: string;
      branchId?: string;
      status?: ShiftStatus[];
      startDate?: Date;
      endDate?: Date;
      workerId?: string;
      priority?: ShiftPriority;
    },
    options: {
      page?: number;
      limit?: number;
      sort?: string;
    } = {}
  ): Promise<{ shifts: IShift[]; total: number }> {
    const query: any = {};

    if (criteria.clientId) {
      query.clientId = criteria.clientId;
    }

    if (criteria.branchId) {
      query.branchId = criteria.branchId;
    }

    if (criteria.status?.length) {
      query.status = { $in: criteria.status };
    }

    if (criteria.startDate || criteria.endDate) {
      query.startTime = {};
      if (criteria.startDate) {
        query.startTime.$gte = criteria.startDate;
      }
      if (criteria.endDate) {
        query.startTime.$lte = criteria.endDate;
      }
    }

    if (criteria.workerId) {
      query['assignments.workerId'] = criteria.workerId;
    }

    if (criteria.priority) {
      query.priority = criteria.priority;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      Shift.find(query)
        .sort(options.sort || '-startTime')
        .skip(skip)
        .limit(limit),
      Shift.countDocuments(query)
    ]);

    return { shifts, total };
  }

  private static async validateShiftCreation(
    shiftData: Partial<IShift>
  ): Promise<void> {
    if (!shiftData.startTime || !shiftData.endTime) {
      throw new AppError(400, 'Start and end times are required');
    }

    const duration = Math.floor(
      (shiftData.endTime.getTime() - shiftData.startTime.getTime()) / (1000 * 60)
    );

    if (duration < this.MIN_SHIFT_DURATION || duration > this.MAX_SHIFT_DURATION) {
      throw new AppError(400, 'Invalid shift duration');
    }

    if (shiftData.startTime < new Date(Date.now() + this.ADVANCE_NOTICE_HOURS * 3600000)) {
      throw new AppError(400, `Shifts must be created at least ${this.ADVANCE_NOTICE_HOURS} hours in advance`);
    }

    await validateShiftTiming(shiftData.startTime, shiftData.endTime);
  }

  private static sanitizeShiftData(data: Partial<IShift>): Partial<IShift> {
    if (data.description) {
      data.description = sanitizeHtml(data.description);
    }

    if (data.location?.instructions) {
      data.location.instructions = sanitizeHtml(data.location.instructions);
    }

    return data;
  }

  private static async validateShiftPublishing(shift: IShift): Promise<void> {
    const requiredFields = [
      'title',
      'startTime',
      'endTime',
      'location',
      'requirements',
      'compensation'
    ];

    const missingFields = requiredFields.filter(field => !shift[field]);
    if (missingFields.length) {
      throw new AppError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  private static async validateWorkerAvailability(
    workerId: string,
    shift: IShift
  ): Promise<void> {
    // Check for overlapping shifts
    const overlapping = await Shift.findOne({
      'assignments.workerId': workerId,
      'assignments.status': 'accepted',
      $or: [
        {
          startTime: { $lt: shift.endTime },
          endTime: { $gt: shift.startTime }
        }
      ]
    });

    if (overlapping) {
      throw new AppError(400, 'Worker has overlapping shifts');
    }
  }

  private static async queueShiftMatching(shift: IShift): Promise<void> {
    await this.matchingQueue.add('match-workers', {
      shiftId: shift._id,
      requirements: shift.requirements,
      location: shift.location,
      startTime: shift.startTime,
      endTime: shift.endTime
    });
  }

  private static async notifyMatchingWorkers(shift: IShift): Promise<void> {
    const matchingWorkers = await matchingService.findMatchingWorkers(shift);

    await Promise.all(
      matchingWorkers.map(worker =>
        notificationService.send({
          userId: worker._id,
          title: 'New Matching Shift',
          body: `A new shift matching your profile is available: ${shift.title}`,
          type: 'SHIFT_MATCH',
          data: { shiftId: shift._id }
        })
      )
    );
  }

  private static async notifyStatusUpdate(
    shift: IShift,
    workerId: string,
    status: string
  ): Promise<void> {
    const client = await Client.findById(shift.clientId);
    
    await notificationService.send({
      userId: client!.managerId,
      title: 'Shift Status Update',
      body: `Worker has ${status} shift: ${shift.title}`,
      type: 'SHIFT_STATUS_UPDATE',
      data: { shiftId: shift._id, workerId }
    });
  }

  private static async notifyShiftCompletion(
    shift: IShift,
    workerId: string
  ): Promise<void> {
    const [client, worker] = await Promise.all([
      Client.findById(shift.clientId),
      User.findById(workerId)
    ]);

    await Promise.all([
      notificationService.send({
        userId: client!.managerId,
        title: 'Shift Completed',
        body: `${worker!.name} has completed their shift: ${shift.title}`,
        type: 'SHIFT_COMPLETED',
        data: { shiftId: shift._id, workerId }
      }),
      notificationService.send({
        userId: workerId,
        title: 'Shift Completion Confirmed',
        body: `Your shift ${shift.title} has been marked as completed`,
        type: 'SHIFT_COMPLETED',
        data: { shiftId: shift._id }
      })
    ]);
  }
}

// Initialize the service
ShiftService.initialize(); 