import { Schema } from 'mongoose';

export const ShiftSchema = new Schema({
  workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  date: { type: Date, required: true },
  hours: Number,
  rate: Number,
  status: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 