import { Schema } from 'mongoose';

export const PaymentMethodSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  details: { type: Schema.Types.Mixed, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const InvoiceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date },
  items: [{
    description: String,
    amount: Number
  }]
}); 