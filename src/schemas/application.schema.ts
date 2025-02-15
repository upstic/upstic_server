import { Schema } from 'mongoose';

export const ApplicationSchema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  status: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  rate: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 