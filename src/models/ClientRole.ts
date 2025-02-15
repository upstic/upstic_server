import mongoose, { Document, Schema } from 'mongoose';

export enum RoleScope {
  GLOBAL = 'global',
  BRANCH = 'branch',
  DEPARTMENT = 'department'
}

export enum AccessLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3
}

export interface IPermission {
  resource: string;
  access: AccessLevel;
  constraints?: {
    timeRestricted?: boolean;
    scheduleOnly?: boolean;
    requiresApproval?: boolean;
    maxAmount?: number;
    departments?: string[];
    locations?: string[];
  };
}

export interface IClientRole extends Document {
  _id: Schema.Types.ObjectId;
  clientId: Schema.Types.ObjectId;
  name: string;
  description: string;
  scope: RoleScope;
  isCustom: boolean;
  isActive: boolean;
  permissions: IPermission[];
  hierarchy: number;
  allowedActions: string[];
  restrictions: {
    maxUsers?: number;
    timeRestricted?: boolean;
    requiresApproval?: boolean;
    approvalChain?: string[];
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    version: number;
  };
  assignments: Array<{
    userId: string;
    assignedBy: string;
    assignedAt: Date;
    expiresAt?: Date;
    status: 'active' | 'suspended' | 'expired';
    scope?: {
      branchIds?: string[];
      departmentIds?: string[];
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const clientRoleSchema = new Schema<IClientRole>({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  scope: {
    type: String,
    enum: Object.values(RoleScope),
    required: true
  },
  isCustom: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    resource: {
      type: String,
      required: true
    },
    access: {
      type: Number,
      enum: Object.values(AccessLevel),
      required: true
    },
    constraints: {
      timeRestricted: Boolean,
      scheduleOnly: Boolean,
      requiresApproval: Boolean,
      maxAmount: Number,
      departments: [String],
      locations: [String]
    }
  }],
  hierarchy: {
    type: Number,
    required: true,
    min: 0
  },
  allowedActions: [String],
  restrictions: {
    maxUsers: Number,
    timeRestricted: Boolean,
    requiresApproval: Boolean,
    approvalChain: [String]
  },
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  },
  assignments: [{
    userId: {
      type: String,
      ref: 'User'
    },
    assignedBy: {
      type: String,
      ref: 'User'
    },
    assignedAt: Date,
    expiresAt: Date,
    status: {
      type: String,
      enum: ['active', 'suspended', 'expired'],
      default: 'active'
    },
    scope: {
      branchIds: [String],
      departmentIds: [String]
    }
  }]
}, {
  timestamps: true
});

// Indexes
clientRoleSchema.index({ clientId: 1, name: 1 }, { unique: true });
clientRoleSchema.index({ clientId: 1, isActive: 1 });
clientRoleSchema.index({ 'assignments.userId': 1, isActive: 1 });
clientRoleSchema.index({ 'assignments.expiresAt': 1 });

// Ensure role name uniqueness per client
clientRoleSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    const ClientRole = mongoose.model<IClientRole>('ClientRole');
    const existingRole = await ClientRole.findOne({
      clientId: this.clientId,
      name: this.name,
      _id: { $ne: this._id }
    });
    
    if (existingRole) {
      throw new Error('Role name must be unique within a client');
    }
  }
  next();
});

export const ClientRole = mongoose.model<IClientRole>('ClientRole', clientRoleSchema); 