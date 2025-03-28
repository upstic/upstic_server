import { Schema } from 'mongoose';
import { JobOfferStatus } from '../interfaces/job-offer.interface';

export const JobOfferSchema = new Schema({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recruiterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(JobOfferStatus),
    default: JobOfferStatus.PENDING,
    required: true
  },
  offerDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  responseDate: {
    type: Date
  },
  expiryDate: {
    type: Date,
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  offerType: {
    type: String,
    enum: ['permanent', 'temporary', 'contract'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  contractType: {
    type: String,
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  probationPeriod: {
    duration: Number,
    endDate: Date
  },
  rejectionReason: String,
  notes: String,
  documents: [{
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  history: [{
    status: {
      type: String,
      enum: Object.values(JobOfferStatus),
      required: true
    },
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: String
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
JobOfferSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
JobOfferSchema.index({ status: 1 });
JobOfferSchema.index({ expiryDate: 1 });
JobOfferSchema.index({ offerDate: -1 });
JobOfferSchema.index({ startDate: 1 }); 