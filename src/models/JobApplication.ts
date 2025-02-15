import mongoose, { Document, Schema } from 'mongoose';

interface IJobApplication extends Document {
  job: Schema.Types.ObjectId;
  applicant: Schema.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema({
  job: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema); 