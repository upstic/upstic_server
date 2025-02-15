import { Schema, Document } from 'mongoose';

export interface EmailLog extends Document {
  to: string;
  subject: string;
  template: string;
  messageId?: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: Date;
}

export const EmailLogSchema = new Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  template: { type: String, required: true },
  messageId: String,
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: String,
  timestamp: { type: Date, default: Date.now }
}); 