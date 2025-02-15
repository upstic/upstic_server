import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  jobId: Schema.Types.ObjectId;
  workerId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  type: 'regular' | 'overtime' | 'holiday' | 'emergency';
  schedule: {
    startTime: Date;
    endTime: Date;
    breakDuration: number;
    timezone: string;
  };
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'missed';
  location: {
    siteId: Schema.Types.ObjectId;
    name: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  attendance: {
    clockIn?: Date;
    clockOut?: Date;
    actualBreakDuration?: number;
    totalHours?: number;
    status: 'pending' | 'present' | 'late' | 'absent';
    verifiedBy?: Schema.Types.ObjectId;
  };
  billing: {
    rateType: 'hourly' | 'fixed' | 'overtime';
    rate: number;
    currency: string;
    minimumHours?: number;
    totalAmount?: number;
  };
  requirements: {
    skills: string[];
    certifications: string[];
    equipment: string[];
    dress_code?: string;
  };
  notes: Array<{
    content: string;
    author: Schema.Types.ObjectId;
    timestamp: Date;
  }>;
}

const ShiftSchema: Schema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  type: {
    type: String,
    enum: ['regular', 'overtime', 'holiday', 'emergency'],
    required: true
  },
  schedule: {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    breakDuration: { type: Number, default: 0 }, // in minutes
    timezone: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  location: {
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  attendance: {
    clockIn: Date,
    clockOut: Date,
    actualBreakDuration: Number,
    totalHours: Number,
    status: {
      type: String,
      enum: ['pending', 'present', 'late', 'absent'],
      default: 'pending'
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  billing: {
    rateType: {
      type: String,
      enum: ['hourly', 'fixed', 'overtime'],
      required: true
    },
    rate: { type: Number, required: true },
    currency: { type: String, required: true },
    minimumHours: Number,
    totalAmount: Number
  },
  requirements: {
    skills: [String],
    certifications: [String],
    equipment: [String],
    dress_code: String
  },
  notes: [{
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes
ShiftSchema.index({ jobId: 1, workerId: 1, 'schedule.startTime': 1 });
ShiftSchema.index({ branchId: 1, status: 1 });
ShiftSchema.index({ 'schedule.startTime': 1, status: 1 });
ShiftSchema.index({ workerId: 1, 'schedule.startTime': 1 });

// Methods
ShiftSchema.methods.calculateTotalHours = function(): number {
  if (!this.attendance.clockIn || !this.attendance.clockOut) return 0;
  
  const totalMinutes = (this.attendance.clockOut.getTime() - this.attendance.clockIn.getTime()) / 1000 / 60;
  const breakDuration = this.attendance.actualBreakDuration || this.schedule.breakDuration;
  return Math.round((totalMinutes - breakDuration) / 60 * 100) / 100;
};

ShiftSchema.methods.calculateBilling = async function() {
  const totalHours = this.calculateTotalHours();
  let totalAmount = 0;

  switch (this.billing.rateType) {
    case 'hourly':
      totalAmount = totalHours * this.billing.rate;
      break;
    case 'fixed':
      totalAmount = this.billing.rate;
      break;
    case 'overtime':
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(totalHours - 8, 0);
      totalAmount = (regularHours * this.billing.rate) + (overtimeHours * this.billing.rate * 1.5);
      break;
  }

  this.billing.totalAmount = Math.round(totalAmount * 100) / 100;
  this.attendance.totalHours = totalHours;
  await this.save();
};

export default mongoose.model<IShift>('Shift', ShiftSchema); 