import { Schema } from 'mongoose';

export const ClientSchema = new Schema({
  companyName: { type: String, required: true },
  description: String,
  industry: String,
  status: { type: String, required: true },
  contacts: [{
    name: String,
    email: String,
    phone: String,
    role: String,
    isPrimary: Boolean
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 