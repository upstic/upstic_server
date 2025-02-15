import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { NotificationService } from '../../services/notification.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class StaffingRequirementTracker {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly ALERT_THRESHOLD = 0.8; // 80% fulfillment threshold

  constructor(
    @InjectModel('StaffingRequirement') private requirementModel: Model<any>,
    @InjectModel('Branch') private branchModel: Model<any>,
    @InjectModel('Worker') private workerModel: Model<any>,
    private notificationService: NotificationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createRequirement(
    input: StaffingRequirementInput
  ): Promise<StaffingRequirementResponse> {
    try {
      // Validate requirement data
      await this.validateRequirementData(input);

      // Create requirement
      const requirement = await this.requirementModel.create({
        ...input,
        status: 'active',
        filledPositions: 0,
        createdAt: new Date()
      });

      // Update branch staffing needs
      await this.updateBranchStaffingNeeds(requirement.branchId);

      // Check if immediate staffing action is needed
      await this.checkStaffingAlerts(requirement);

      return {
        success: true,
        requirementId: requirement._id,
        message: 'Staffing requirement created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating staffing requirement:', error);
      throw error;
    }
  }

  async updateRequirementStatus(
    requirementId: string,
    updates: RequirementStatusUpdate
  ): Promise<StaffingRequirementResponse> {
    try {
      const requirement = await this.requirementModel.findByIdAndUpdate(
        requirementId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!requirement) {
        throw new Error('Requirement not found');
      }

      // Update branch staffing needs
      await this.updateBranchStaffingNeeds(requirement.branchId);

      // Check staffing levels
      await this.checkStaffingAlerts(requirement);

      return {
        success: true,
        requirementId: requirement._id,
        message: 'Requirement status updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating requirement status:', error);
      throw error;
    }
  }

  async getStaffingAnalytics(
    branchId: string
  ): Promise<StaffingAnalytics> {
    const cacheKey = `staffing:analytics:${branchId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const requirements = await this.requirementModel.find({
      branchId,
      status: 'active'
    });

    const analytics = this.calculateStaffingAnalytics(requirements);
    await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

    return analytics;
  }

  async trackWorkerAssignments(
    requirementId: string,
    assignments: WorkerAssignment[]
  ): Promise<void> {
    try {
      const requirement = await this.requirementModel.findById(requirementId);
      if (!requirement) {
        throw new Error('Requirement not found');
      }

      // Update filled positions count
      const updatedCount = requirement.filledPositions + assignments.length;
      if (updatedCount > requirement.headcount) {
        throw new Error('Assignment would exceed required headcount');
      }

      // Update requirement
      await this.requirementModel.findByIdAndUpdate(
        requirementId,
        {
          filledPositions: updatedCount,
          $push: { assignments: { $each: assignments } },
          updatedAt: new Date()
        }
      );

      // Update worker statuses
      await Promise.all(
        assignments.map(assignment =>
          this.updateWorkerStatus(assignment.workerId, requirementId)
        )
      );

      // Check if requirement is now fulfilled
      if (updatedCount === requirement.headcount) {
        await this.handleRequirementFulfillment(requirement);
      }
    } catch (error) {
      this.logger.error('Error tracking worker assignments:', error);
      throw error;
    }
  }

  private async validateRequirementData(
    data: StaffingRequirementInput
  ): Promise<void> {
    // Check if branch exists
    const branch = await this.branchModel.findById(data.branchId);
    if (!branch) {
      throw new Error('Invalid branch ID');
    }

    // Validate headcount
    if (data.headcount < 1) {
      throw new Error('Headcount must be at least 1');
    }

    // Validate dates
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new Error('Start date must be before end date');
      }
    }

    // Check for overlapping requirements
    const overlapping = await this.requirementModel.findOne({
      branchId: data.branchId,
      role: data.role,
      status: 'active',
      $or: [
        {
          startDate: { $lte: data.startDate },
          endDate: { $gte: data.startDate }
        },
        {
          startDate: { $lte: data.endDate },
          endDate: { $gte: data.endDate }
        }
      ]
    });

    if (overlapping) {
      throw new Error('Overlapping requirement exists for this role and period');
    }
  }

  private async updateBranchStaffingNeeds(
    branchId: string
  ): Promise<void> {
    const requirements = await this.requirementModel.find({
      branchId,
      status: 'active'
    });

    const totalRequired = requirements.reduce(
      (sum, req) => sum + req.headcount,
      0
    );
    const totalFilled = requirements.reduce(
      (sum, req) => sum + (req.filledPositions || 0),
      0
    );

    await this.branchModel.findByIdAndUpdate(
      branchId,
      {
        staffingNeeds: {
          required: totalRequired,
          filled: totalFilled,
          gap: totalRequired - totalFilled
        },
        updatedAt: new Date()
      }
    );

    // Invalidate cache
    await this.cacheService.delete(`staffing:analytics:${branchId}`);
  }

  private async checkStaffingAlerts(
    requirement: any
  ): Promise<void> {
    const fulfillmentRate = 
      requirement.filledPositions / requirement.headcount;

    if (fulfillmentRate < this.ALERT_THRESHOLD) {
      await this.notificationService.notify({
        type: 'STAFFING_ALERT',
        userId: requirement.branchId, // Branch manager
        data: {
          requirementId: requirement._id,
          role: requirement.role,
          fulfilled: requirement.filledPositions,
          required: requirement.headcount,
          fulfillmentRate: fulfillmentRate
        }
      });
    }
  }

  private async updateWorkerStatus(
    workerId: string,
    requirementId: string
  ): Promise<void> {
    await this.workerModel.findByIdAndUpdate(
      workerId,
      {
        currentAssignment: requirementId,
        status: 'assigned',
        updatedAt: new Date()
      }
    );
  }

  private async handleRequirementFulfillment(
    requirement: any
  ): Promise<void> {
    await this.notificationService.notify({
      type: 'REQUIREMENT_FULFILLED',
      userId: requirement.branchId,
      data: {
        requirementId: requirement._id,
        role: requirement.role,
        headcount: requirement.headcount
      }
    });
  }

  private calculateStaffingAnalytics(
    requirements: any[]
  ): StaffingAnalytics {
    const analytics: StaffingAnalytics = {
      totalRequired: 0,
      totalFilled: 0,
      fulfillmentRate: 0,
      byRole: {},
      trends: {
        daily: [],
        weekly: [],
        monthly: []
      }
    };

    requirements.forEach(req => {
      analytics.totalRequired += req.headcount;
      analytics.totalFilled += req.filledPositions || 0;

      if (!analytics.byRole[req.role]) {
        analytics.byRole[req.role] = {
          required: 0,
          filled: 0,
          gap: 0
        };
      }

      analytics.byRole[req.role].required += req.headcount;
      analytics.byRole[req.role].filled += req.filledPositions || 0;
      analytics.byRole[req.role].gap = 
        analytics.byRole[req.role].required - 
        analytics.byRole[req.role].filled;
    });

    analytics.fulfillmentRate = 
      (analytics.totalFilled / analytics.totalRequired) * 100;

    return analytics;
  }
}

interface StaffingRequirementInput {
  branchId: string;
  role: string;
  headcount: number;
  startDate: Date;
  endDate: Date;
  skills: string[];
  shift?: {
    type: 'day' | 'night' | 'rotating';
    hours: {
      start: string;
      end: string;
    };
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements?: {
    experience?: number;
    certifications?: string[];
    languages?: string[];
  };
}

interface RequirementStatusUpdate {
  status?: 'active' | 'fulfilled' | 'cancelled';
  filledPositions?: number;
  notes?: string;
}

interface WorkerAssignment {
  workerId: string;
  startDate: Date;
  endDate?: Date;
  shift?: string;
  status: 'pending' | 'active' | 'completed';
}

interface StaffingRequirementResponse {
  success: boolean;
  requirementId: string;
  message: string;
}

interface StaffingAnalytics {
  totalRequired: number;
  totalFilled: number;
  fulfillmentRate: number;
  byRole: {
    [role: string]: {
      required: number;
      filled: number;
      gap: number;
    };
  };
  trends: {
    daily: Array<{
      date: Date;
      required: number;
      filled: number;
    }>;
    weekly: Array<{
      week: string;
      required: number;
      filled: number;
    }>;
    monthly: Array<{
      month: string;
      required: number;
      filled: number;
    }>;
  };
} 