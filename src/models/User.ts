import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUserDocument } from '../interfaces/models.interface';

export enum UserRole {
  WORKER = 'worker',
  CLIENT = 'client',
  RECRUITER = 'recruiter',
  ADMIN = 'admin'
}

export const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phone: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    preferences: {
      availability: [{
        startDate: Date,
        endDate: Date,
        isAvailable: Boolean
      }],
      locations: [String],
    },
    permissions: {
      type: [String],
      default: []
    },
    tokenVersion: {
      type: String,
      default: '1'
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Fix type for password comparison
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

export const User = mongoose.model<IUserDocument>('User', UserSchema); 