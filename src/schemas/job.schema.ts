import { Schema } from 'mongoose';

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
  status: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 