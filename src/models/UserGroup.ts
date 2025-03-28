import mongoose, { Document, Schema } from 'mongoose';

export interface IUserGroup extends Document {
  user: Schema.Types.ObjectId;
  group: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userGroupSchema = new Schema<IUserGroup>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'AuthGroup',
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

// Compound index to ensure uniqueness of user-group pairs
userGroupSchema.index({ user: 1, group: 1 }, { unique: true });

// Static methods
userGroupSchema.statics.findByUser = function(userId: Schema.Types.ObjectId | string) {
  return this.find({ user: userId }).populate('group');
};

userGroupSchema.statics.findByGroup = function(groupId: Schema.Types.ObjectId | string) {
  return this.find({ group: groupId }).populate('user');
};

userGroupSchema.statics.addUserToGroup = async function(
  userId: Schema.Types.ObjectId | string,
  groupId: Schema.Types.ObjectId | string,
  createdById: Schema.Types.ObjectId | string
) {
  try {
    return await this.create({
      user: userId,
      group: groupId,
      createdBy: createdById
    });
  } catch (error) {
    // Handle duplicate key error (user already in group)
    if ((error as any).code === 11000) {
      return null;
    }
    throw error;
  }
};

userGroupSchema.statics.removeUserFromGroup = function(
  userId: Schema.Types.ObjectId | string,
  groupId: Schema.Types.ObjectId | string
) {
  return this.findOneAndDelete({ user: userId, group: groupId });
};

userGroupSchema.statics.getUserGroups = async function(userId: Schema.Types.ObjectId | string) {
  const userGroups = await this.find({ user: userId }).populate({
    path: 'group',
    populate: {
      path: 'permissions',
      model: 'AuthPermission'
    }
  });
  
  return userGroups.map(ug => ug.group);
};

export const UserGroup = mongoose.model<IUserGroup>('UserGroup', userGroupSchema); 