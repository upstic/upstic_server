import { Branch, BranchStatus, BranchType, IBranch } from '../models/Branch';
import { Client } from '../models/Client';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { geocodeAddress } from '../utils/geocoding';
import { generateBranchCode } from '../utils/code-generator';
import { validateOperatingHours } from '../utils/time-validator';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';

export class BranchService {
  private static readonly GEOCODING_RETRIES = 3;
  private static readonly MAX_BRANCHES_PER_CLIENT = 100;

  static async createBranch(
    clientId: string,
    userId: string,
    branchData: Partial<IBranch>
  ): Promise<IBranch> {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError(404, 'Client not found');
    }

    // Check branch limit
    const branchCount = await Branch.countDocuments({ clientId });
    if (branchCount >= this.MAX_BRANCHES_PER_CLIENT) {
      throw new AppError(400, 'Maximum number of branches reached');
    }

    // Generate unique branch code
    const branchCode = await generateBranchCode(client.name, branchData.city);

    // Geocode address
    const coordinates = await this.geocodeWithRetry(
      branchData.address?.street,
      branchData.address?.city,
      branchData.address?.country
    );

    // Validate operating hours
    if (branchData.operatingHours) {
      validateOperatingHours(branchData.operatingHours);
    }

    // Sanitize input
    const sanitizedData = this.sanitizeBranchData(branchData);

    const branch = new Branch({
      ...sanitizedData,
      clientId,
      code: branchCode,
      address: {
        ...sanitizedData.address,
        coordinates
      },
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedAt: new Date()
      }
    });

    await branch.save();

    // Notify client admin
    await this.notifyBranchCreation(branch);

    return branch;
  }

  static async updateBranch(
    branchId: string,
    userId: string,
    updates: Partial<IBranch>
  ): Promise<IBranch> {
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new AppError(404, 'Branch not found');
    }

    // Sanitize updates
    const sanitizedUpdates = this.sanitizeBranchData(updates);

    // Geocode if address is updated
    if (updates.address) {
      const coordinates = await this.geocodeWithRetry(
        updates.address.street,
        updates.address.city,
        updates.address.country
      );
      sanitizedUpdates.address.coordinates = coordinates;
    }

    // Validate operating hours if updated
    if (updates.operatingHours) {
      validateOperatingHours(updates.operatingHours);
    }

    Object.assign(branch, sanitizedUpdates);
    branch.metadata.lastModifiedBy = userId;
    branch.metadata.lastModifiedAt = new Date();

    await branch.save();

    // Notify relevant staff
    await this.notifyBranchUpdate(branch);

    return branch;
  }

  static async updateBranchStatus(
    branchId: string,
    userId: string,
    status: BranchStatus,
    reason?: string
  ): Promise<IBranch> {
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new AppError(404, 'Branch not found');
    }

    branch.status = status;
    branch.metadata.lastModifiedBy = userId;
    branch.metadata.lastModifiedAt = new Date();
    if (reason) {
      branch.metadata.notes = reason;
    }

    await branch.save();

    // Notify relevant parties
    await this.notifyStatusChange(branch, status);

    return branch;
  }

  static async addStaffMember(
    branchId: string,
    staffData: {
      userId: string;
      role: string;
      primary: boolean;
      startDate: Date;
    }
  ): Promise<IBranch> {
    const [branch, user] = await Promise.all([
      Branch.findById(branchId),
      User.findById(staffData.userId)
    ]);

    if (!branch) {
      throw new AppError(404, 'Branch not found');
    }
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Check if user is already staff at this branch
    const existingStaff = branch.staff.find(s => s.userId === staffData.userId);
    if (existingStaff) {
      throw new AppError(400, 'User is already staff at this branch');
    }

    // If primary, remove primary status from other staff
    if (staffData.primary) {
      branch.staff.forEach(s => {
        if (s.primary) s.primary = false;
      });
    }

    branch.staff.push(staffData);
    await branch.save();

    // Notify new staff member
    await notificationService.send({
      userId: staffData.userId,
      title: 'Branch Assignment',
      body: `You have been assigned to ${branch.name} as ${staffData.role}`,
      type: 'BRANCH_ASSIGNMENT'
    });

    return branch;
  }

  static async updateMetrics(
    branchId: string,
    metrics: Partial<IBranch['metrics']>
  ): Promise<IBranch> {
    const branch = await Branch.findByIdAndUpdate(
      branchId,
      { $set: { metrics } },
      { new: true }
    );

    if (!branch) {
      throw new AppError(404, 'Branch not found');
    }

    return branch;
  }

  static async searchBranches(
    criteria: {
      clientId?: string;
      status?: BranchStatus;
      type?: BranchType;
      location?: {
        city?: string;
        state?: string;
        country?: string;
      };
      services?: string[];
      keywords?: string;
    },
    options: {
      page?: number;
      limit?: number;
      sort?: string;
    } = {}
  ): Promise<{ branches: IBranch[]; total: number }> {
    const query: any = {};

    if (criteria.clientId) {
      query.clientId = criteria.clientId;
    }

    if (criteria.status) {
      query.status = criteria.status;
    }

    if (criteria.type) {
      query.type = criteria.type;
    }

    if (criteria.location) {
      if (criteria.location.city) {
        query['address.city'] = new RegExp(criteria.location.city, 'i');
      }
      if (criteria.location.state) {
        query['address.state'] = new RegExp(criteria.location.state, 'i');
      }
      if (criteria.location.country) {
        query['address.country'] = criteria.location.country;
      }
    }

    if (criteria.services?.length) {
      query['services.name'] = { $all: criteria.services };
    }

    if (criteria.keywords) {
      query.$text = { $search: criteria.keywords };
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [branches, total] = await Promise.all([
      Branch.find(query)
        .sort(options.sort || '-metadata.createdAt')
        .skip(skip)
        .limit(limit),
      Branch.countDocuments(query)
    ]);

    return { branches, total };
  }

  private static sanitizeBranchData(data: Partial<IBranch>): Partial<IBranch> {
    if (data.services) {
      data.services = data.services.map(service => ({
        ...service,
        description: sanitizeHtml(service.description)
      }));
    }

    if (data.metadata?.notes) {
      data.metadata.notes = sanitizeHtml(data.metadata.notes);
    }

    return data;
  }

  private static async geocodeWithRetry(
    street: string,
    city: string,
    country: string,
    retries = this.GEOCODING_RETRIES
  ): Promise<{ latitude: number; longitude: number } | undefined> {
    for (let i = 0; i < retries; i++) {
      try {
        return await geocodeAddress(street, city, country);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  private static async notifyBranchCreation(branch: IBranch): Promise<void> {
    const client = await Client.findById(branch.clientId);
    
    await notificationService.send({
      userId: client!.managerId,
      title: 'New Branch Created',
      body: `Branch ${branch.name} has been created successfully`,
      type: 'BRANCH_CREATED',
      data: { branchId: branch._id }
    });
  }

  private static async notifyBranchUpdate(branch: IBranch): Promise<void> {
    // Notify all active staff members
    const activeStaff = branch.staff.filter(s => !s.endDate);
    
    await Promise.all(
      activeStaff.map(staff =>
        notificationService.send({
          userId: staff.userId,
          title: 'Branch Update',
          body: `${branch.name} branch information has been updated`,
          type: 'BRANCH_UPDATED',
          data: { branchId: branch._id }
        })
      )
    );
  }

  private static async notifyStatusChange(
    branch: IBranch,
    newStatus: BranchStatus
  ): Promise<void> {
    const client = await Client.findById(branch.clientId);
    const statusMessage = this.getStatusChangeMessage(newStatus);

    await Promise.all([
      notificationService.send({
        userId: client!.managerId,
        title: 'Branch Status Change',
        body: `${branch.name} ${statusMessage}`,
        type: 'BRANCH_STATUS_CHANGE',
        data: { branchId: branch._id }
      }),
      ...branch.staff.map(staff =>
        notificationService.send({
          userId: staff.userId,
          title: 'Branch Status Change',
          body: `${branch.name} ${statusMessage}`,
          type: 'BRANCH_STATUS_CHANGE',
          data: { branchId: branch._id }
        })
      )
    ]);
  }

  private static getStatusChangeMessage(status: BranchStatus): string {
    switch (status) {
      case BranchStatus.ACTIVE:
        return 'is now active';
      case BranchStatus.INACTIVE:
        return 'has been deactivated';
      case BranchStatus.TEMPORARY_CLOSED:
        return 'is temporarily closed';
      case BranchStatus.PERMANENTLY_CLOSED:
        return 'has been permanently closed';
      default:
        return 'status has been updated';
    }
  }
} 