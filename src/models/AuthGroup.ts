import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthGroup extends Document {
  name: string;
  description: string;
  isActive: boolean;
  permissions: Schema.Types.ObjectId[];
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const authGroupSchema = new Schema<IAuthGroup>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'AuthPermission'
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Methods
authGroupSchema.methods.hasPermission = function(permissionId: Schema.Types.ObjectId | string) {
  return this.permissions.some(p => p.toString() === permissionId.toString());
};

authGroupSchema.methods.addPermission = function(permissionId: Schema.Types.ObjectId | string) {
  if (!this.hasPermission(permissionId)) {
    this.permissions.push(permissionId);
  }
  return this.save();
};

authGroupSchema.methods.removePermission = function(permissionId: Schema.Types.ObjectId | string) {
  this.permissions = this.permissions.filter(
    p => p.toString() !== permissionId.toString()
  );
  return this.save();
};

// Static methods
authGroupSchema.statics.findByName = function(name: string) {
  return this.findOne({ name, isActive: true });
};

authGroupSchema.statics.findActiveGroups = function() {
  return this.find({ isActive: true });
};

export const AuthGroup = mongoose.model<IAuthGroup>('AuthGroup', authGroupSchema); 