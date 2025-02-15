import { Schema } from 'mongoose';

export const WorkerSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  skills: [String],
  experience: Number,
  availability: String,
  preferredLocation: String,
  location: String,
  salary: {
    expected: Number,
    currency: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 