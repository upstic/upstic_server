import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPermission extends Document {
  user: Schema.Types.ObjectId;
  permission: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userPermissionSchema = new Schema<IUserPermission>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Compound index to ensure uniqueness of user-permission pairs
userPermissionSchema.index({ user: 1, permission: 1 }, { unique: true });

// Static methods
userPermissionSchema.statics.findByUser = function(userId: Schema.Types.ObjectId | string) {
  return this.find({ user: userId }).populate('permission');
};

userPermissionSchema.statics.findByPermission = function(permissionId: Schema.Types.ObjectId | string) {
  return this.find({ permission: permissionId }).populate('user');
};

userPermissionSchema.statics.addPermissionToUser = async function(
  userId: Schema.Types.ObjectId | string,
  permissionId: Schema.Types.ObjectId | string,
  createdById: Schema.Types.ObjectId | string
) {
  try {
    return await this.create({
      user: userId,
      permission: permissionId,
      createdBy: createdById
    });
  } catch (error) {
    // Handle duplicate key error (permission already assigned to user)
    if ((error as any).code === 11000) {
      return null;
    }
    throw error;
  }
};

userPermissionSchema.statics.removePermissionFromUser = function(
  userId: Schema.Types.ObjectId | string,
  permissionId: Schema.Types.ObjectId | string
) {
  return this.findOneAndDelete({ user: userId, permission: permissionId });
};

userPermissionSchema.statics.getUserPermissions = async function(userId: Schema.Types.ObjectId | string) {
  const userPermissions = await this.find({ user: userId }).populate('permission');
  return userPermissions.map(up => up.permission);
};

userPermissionSchema.statics.hasPermission = async function(
  userId: Schema.Types.ObjectId | string,
  permissionCodename: string
) {
  const count = await this.countDocuments({
    user: userId,
    permission: { $in: await mongoose.model('AuthPermission').find({ codename: permissionCodename }) }
  });
  
  return count > 0;
};

export const UserPermission = mongoose.model<IUserPermission>('UserPermission', userPermissionSchema); 