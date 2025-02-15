import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  code: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contact: {
    email: string;
    phone: string;
    fax?: string;
    website?: string;
  };
  manager: {
    userId: Schema.Types.ObjectId;
    name: string;
    email: string;
    phone: string;
  };
  operatingHours: {
    timezone: string;
    weekdays: {
      start: string;
      end: string;
    };
    weekend?: {
      start: string;
      end: string;
    };
    holidays: Array<{
      date: Date;
      description: string;
    }>;
  };
  services: string[];
  status: 'active' | 'inactive' | 'maintenance';
  metrics: {
    activeWorkers: number;
    activeClients: number;
    activeJobs: number;
    successfulPlacements: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema: Schema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    fax: String,
    website: String
  },
  manager: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  operatingHours: {
    timezone: { type: String, required: true },
    weekdays: {
      start: { type: String, required: true },
      end: { type: String, required: true }
    },
    weekend: {
      start: String,
      end: String
    },
    holidays: [{
      date: { type: Date, required: true },
      description: { type: String, required: true }
    }]
  },
  services: [{ type: String, enum: ['recruitment', 'training', 'payroll', 'compliance'] }],
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  metrics: {
    activeWorkers: { type: Number, default: 0 },
    activeClients: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    successfulPlacements: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
BranchSchema.index({ 'location.city': 1, 'location.state': 1 });
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ status: 1 });

// Methods
BranchSchema.methods.updateMetrics = async function() {
  const [activeWorkers, activeClients, activeJobs, successfulPlacements] = await Promise.all([
    mongoose.model('Worker').countDocuments({ branchId: this._id, status: 'active' }),
    mongoose.model('Client').countDocuments({ branchId: this._id, status: 'active' }),
    mongoose.model('Job').countDocuments({ branchId: this._id, status: 'open' }),
    mongoose.model('Application').countDocuments({ 
      branchId: this._id, 
      status: 'placed',
      placementEndDate: { $gt: new Date() }
    })
  ]);

  this.metrics = {
    activeWorkers,
    activeClients,
    activeJobs,
    successfulPlacements
  };

  await this.save();
};

export default mongoose.model<IBranch>('Branch', BranchSchema); 