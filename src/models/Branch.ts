import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  code: string;
  address: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
  status: 'active' | 'inactive';
  manager: string;
  contact: {
    phone: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const BranchSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  location: {
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    address: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  manager: { type: Schema.Types.ObjectId, ref: 'User' },
  contact: {
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema); 