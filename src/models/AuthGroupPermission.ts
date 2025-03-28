import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthGroupPermission extends Document {
  group: Schema.Types.ObjectId;
  permission: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const authGroupPermissionSchema = new Schema<IAuthGroupPermission>(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: 'AuthGroup',
      required: true,
      index: true
    },
    permission: {
      type: Schema.Types.ObjectId,
      ref: 'AuthPermission',
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness of group-permission pairs
authGroupPermissionSchema.index({ group: 1, permission: 1 }, { unique: true });

// Static methods
authGroupPermissionSchema.statics.findByGroup = function(groupId: Schema.Types.ObjectId | string) {
  return this.find({ group: groupId }).populate('permission');
};

authGroupPermissionSchema.statics.findByPermission = function(permissionId: Schema.Types.ObjectId | string) {
  return this.find({ permission: permissionId }).populate('group');
};

authGroupPermissionSchema.statics.addPermissionToGroup = async function(
  groupId: Schema.Types.ObjectId | string,
  permissionId: Schema.Types.ObjectId | string,
  userId: Schema.Types.ObjectId | string
) {
  try {
    return await this.create({
      group: groupId,
      permission: permissionId,
      createdBy: userId
    });
  } catch (error) {
    // Handle duplicate key error (permission already exists in group)
    if ((error as any).code === 11000) {
      return null;
    }
    throw error;
  }
};

authGroupPermissionSchema.statics.removePermissionFromGroup = function(
  groupId: Schema.Types.ObjectId | string,
  permissionId: Schema.Types.ObjectId | string
) {
  return this.findOneAndDelete({ group: groupId, permission: permissionId });
};

export const AuthGroupPermission = mongoose.model<IAuthGroupPermission>(
  'AuthGroupPermission',
  authGroupPermissionSchema
); 