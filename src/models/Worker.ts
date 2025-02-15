import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IWorker extends Document {
  userId: IUser['_id'];
  skills: string[];
  experience: number;
  hourlyRate?: number;
  availability: boolean;
  portfolio?: string[];
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workerSchema = new Schema<IWorker>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    default: 0
  },
  hourlyRate: Number,
  availability: {
    type: Boolean,
    default: true
  },
  portfolio: [String],
  bio: String
}, {
  timestamps: true
});

export const Worker = mongoose.model<IWorker>('Worker', workerSchema); 