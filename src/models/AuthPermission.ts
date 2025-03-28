import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthPermission extends Document {
  name: string;
  codename: string;
  description: string;
  module: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const authPermissionSchema = new Schema<IAuthPermission>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    codename: {
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
    module: {
      type: String,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for module and codename
authPermissionSchema.index({ module: 1, codename: 1 }, { unique: true });

// Static methods
authPermissionSchema.statics.findByCodename = function(codename: string) {
  return this.findOne({ codename, isActive: true });
};

authPermissionSchema.statics.findByModule = function(module: string) {
  return this.find({ module, isActive: true });
};

export const AuthPermission = mongoose.model<IAuthPermission>('AuthPermission', authPermissionSchema); 