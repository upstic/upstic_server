import { ClientRole, RoleScope, AccessLevel, IClientRole, IPermission } from '../models/ClientRole';
import { Client } from '../models/Client';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { validatePermissions } from '../utils/permission-validator';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';

export class ClientRoleService {
  private static readonly SYSTEM_ROLES = ['admin', 'manager', 'supervisor', 'staff'];
  private static readonly MAX_CUSTOM_ROLES = 20;
  private static readonly MIN_HIERARCHY_LEVEL = 0;
  private static readonly MAX_HIERARCHY_LEVEL = 100;

  static async createRole(
    clientId: string,
    userId: string,
    roleData: Partial<IClientRole>
  ): Promise<IClientRole> {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new AppError(404, 'Client not found');
    }

    // Check if it's a system role
    if (this.SYSTEM_ROLES.includes(roleData.name!.toLowerCase())) {
      throw new AppError(400, 'Cannot create system-defined roles');
    }

    // Check custom roles limit
    if (roleData.isCustom) {
      const customRolesCount = await ClientRole.countDocuments({
        clientId,
        isCustom: true
      });
      if (customRolesCount >= this.MAX_CUSTOM_ROLES) {
        throw new AppError(400, 'Maximum number of custom roles reached');
      }
    }

    // Validate hierarchy level
    if (
      roleData.hierarchy! < this.MIN_HIERARCHY_LEVEL ||
      roleData.hierarchy! > this.MAX_HIERARCHY_LEVEL
    ) {
      throw new AppError(400, 'Invalid hierarchy level');
    }

    // Validate permissions
    if (roleData.permissions) {
      validatePermissions(roleData.permissions);
    }

    // Sanitize input
    const sanitizedData = this.sanitizeRoleData(roleData);

    const role = new ClientRole({
      ...sanitizedData,
      clientId,
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
        version: 1
      }
    });

    await role.save();

    // Log role creation
    logger.info(`New role created: ${role.name} for client ${clientId}`);

    return role;
  }

  static async updateRole(
    roleId: string,
    userId: string,
    updates: Partial<IClientRole>
  ): Promise<IClientRole> {
    const role = await ClientRole.findById(roleId);
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Prevent system role modifications
    if (!role.isCustom && updates.permissions) {
      throw new AppError(400, 'Cannot modify system role permissions');
    }

    // Validate hierarchy if updating
    if (updates.hierarchy !== undefined) {
      if (
        updates.hierarchy < this.MIN_HIERARCHY_LEVEL ||
        updates.hierarchy > this.MAX_HIERARCHY_LEVEL
      ) {
        throw new AppError(400, 'Invalid hierarchy level');
      }
    }

    // Validate permissions if updating
    if (updates.permissions) {
      validatePermissions(updates.permissions);
    }

    // Sanitize updates
    const sanitizedUpdates = this.sanitizeRoleData(updates);

    Object.assign(role, sanitizedUpdates);
    role.metadata.lastModifiedBy = userId;
    role.metadata.lastModifiedAt = new Date();
    role.metadata.version += 1;

    await role.save();

    // Notify affected users
    await this.notifyRoleUpdate(role);

    return role;
  }

  static async assignRole(
    roleId: string,
    assignerId: string,
    assignment: {
      userId: string;
      expiresAt?: Date;
      scope?: {
        branchIds?: string[];
        departmentIds?: string[];
      };
    }
  ): Promise<IClientRole> {
    const [role, user, assigner] = await Promise.all([
      ClientRole.findById(roleId),
      User.findById(assignment.userId),
      User.findById(assignerId)
    ]);

    if (!role || !user || !assigner) {
      throw new AppError(404, 'Role, user, or assigner not found');
    }

    // Check if user already has this role
    const existingAssignment = role.assignments.find(
      a => a.userId === assignment.userId && a.status === 'active'
    );
    if (existingAssignment) {
      throw new AppError(400, 'User already has this role');
    }

    // Check max users restriction
    if (
      role.restrictions?.maxUsers &&
      role.assignments.filter(a => a.status === 'active').length >= role.restrictions.maxUsers
    ) {
      throw new AppError(400, 'Maximum number of users for this role reached');
    }

    // Validate scope if provided
    if (assignment.scope) {
      await this.validateAssignmentScope(role.clientId, assignment.scope);
    }

    role.assignments.push({
      userId: assignment.userId,
      assignedBy: assignerId,
      assignedAt: new Date(),
      expiresAt: assignment.expiresAt,
      status: 'active',
      scope: assignment.scope
    });

    await role.save();

    // Notify user of role assignment
    await notificationService.send({
      userId: assignment.userId,
      title: 'Role Assignment',
      body: `You have been assigned the role of ${role.name}`,
      type: 'ROLE_ASSIGNMENT',
      data: { roleId: role._id }
    });

    return role;
  }

  static async revokeRole(
    roleId: string,
    userId: string,
    revokerId: string
  ): Promise<IClientRole> {
    const role = await ClientRole.findById(roleId);
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    const assignment = role.assignments.find(
      a => a.userId === userId && a.status === 'active'
    );
    if (!assignment) {
      throw new AppError(404, 'Active role assignment not found');
    }

    assignment.status = 'expired';
    assignment.expiresAt = new Date();

    await role.save();

    // Notify user of role revocation
    await notificationService.send({
      userId,
      title: 'Role Revoked',
      body: `Your ${role.name} role has been revoked`,
      type: 'ROLE_REVOKED'
    });

    return role;
  }

  static async getUserRoles(
    userId: string,
    clientId: string
  ): Promise<IClientRole[]> {
    return ClientRole.find({
      clientId,
      isActive: true,
      'assignments.userId': userId,
      'assignments.status': 'active',
      'assignments.expiresAt': { $gt: new Date() }
    });
  }

  static async checkPermission(
    userId: string,
    clientId: string,
    resource: string,
    requiredAccess: AccessLevel
  ): Promise<boolean> {
    const roles = await this.getUserRoles(userId, clientId);

    return roles.some(role =>
      role.permissions.some(
        permission =>
          permission.resource === resource &&
          permission.access >= requiredAccess
      )
    );
  }

  private static sanitizeRoleData(data: Partial<IClientRole>): Partial<IClientRole> {
    if (data.description) {
      data.description = sanitizeHtml(data.description);
    }

    return data;
  }

  private static async validateAssignmentScope(
    clientId: string,
    scope: {
      branchIds?: string[];
      departmentIds?: string[];
    }
  ): Promise<void> {
    // Implement scope validation logic
    // e.g., check if branches/departments belong to the client
  }

  private static async notifyRoleUpdate(role: IClientRole): Promise<void> {
    const activeAssignments = role.assignments.filter(a => a.status === 'active');

    await Promise.all(
      activeAssignments.map(assignment =>
        notificationService.send({
          userId: assignment.userId,
          title: 'Role Updated',
          body: `The ${role.name} role has been updated`,
          type: 'ROLE_UPDATED',
          data: { roleId: role._id }
        })
      )
    );
  }
} 