import { Schema } from 'mongoose';
import { JobStatus } from '../interfaces/models.interface';

export const JobSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  skills: [String],
  experience: Number,
  location: String,
  salary: {
    min: Number,
    max: Number,
    currency: String
  },
  status: {
    type: String,
    enum: Object.values(JobStatus),
    default: JobStatus.DRAFT
  },
  publishedAt: {
    type: Date,
    default: null
  },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
}); 