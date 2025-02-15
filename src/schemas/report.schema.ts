import { Schema } from 'mongoose';

export const ReportSchema = new Schema({
  type: { type: String, required: true },
  format: { type: String, required: true },
  status: { type: String, required: true },
  parameters: Schema.Types.Mixed,
  generatedFileUrl: String,
  error: String,
  recipients: [String],
  lastGenerated: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}); 