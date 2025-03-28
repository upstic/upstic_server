import mongoose, { Schema } from 'mongoose';

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  DIRECT_DEPOSIT = 'direct_deposit',
  CHECK = 'check',
  WIRE = 'wire'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed'
}

export interface IPayroll {
  workerId: string;
  clientId: string;
  jobId?: string;
  periodStart: Date;
  periodEnd: Date;
  status: PayrollStatus;
  earnings: {
    regularHours: number;
    overtimeHours: number;
    regularRate: number;
    overtimeRate: number;
    regularAmount: number;
    overtimeAmount: number;
    bonusAmount: number;
    totalAmount: number;
  };
  deductions: {
    tax: number;
    insurance: number;
    other: number;
    totalDeductions: number;
    taxBreakdown?: {
      incomeTax: number;
      nationalInsurance: number;
      studentLoan?: number;
      pension?: number;
      other?: number;
    };
    taxCode?: string;
  };
  netAmount: number;
  paymentDetails: {
    method: PaymentMethod;
    processedAt?: Date;
    reference?: string;
    status?: PaymentStatus;
    paymentDate?: Date;
    failureReason?: string;
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
    notes?: string;
  };
}

const payrollSchema = new Schema<IPayroll>({
  workerId: {
    type: String,
    ref: 'User',
    required: true
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  jobId: {
    type: String,
    ref: 'Job'
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PayrollStatus),
    default: PayrollStatus.DRAFT
  },
  earnings: {
    regularHours: {
      type: Number,
      required: true
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    regularRate: {
      type: Number,
      required: true
    },
    overtimeRate: {
      type: Number,
      required: true
    },
    regularAmount: {
      type: Number,
      required: true
    },
    overtimeAmount: {
      type: Number,
      default: 0
    },
    bonusAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },
  deductions: {
    tax: {
      type: Number,
      required: true
    },
    insurance: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      required: true
    },
    taxBreakdown: {
      incomeTax: {
        type: Number,
        default: 0
      },
      nationalInsurance: {
        type: Number,
        default: 0
      },
      studentLoan: {
        type: Number,
        default: 0
      },
      pension: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    },
    taxCode: {
      type: String,
      trim: true
    }
  },
  netAmount: {
    type: Number,
    required: true
  },
  paymentDetails: {
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true
    },
    processedAt: Date,
    reference: String,
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING
    },
    paymentDate: Date,
    failureReason: String
  },
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: String,
      ref: 'User'
    },
    approvedAt: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes
payrollSchema.index({ workerId: 1, periodStart: 1, periodEnd: 1 });
payrollSchema.index({ clientId: 1, status: 1 });
payrollSchema.index({ status: 1, 'paymentDetails.processedAt': 1 });
payrollSchema.index({ periodStart: 1, periodEnd: 1 });
payrollSchema.index({ jobId: 1 });
payrollSchema.index({ 'paymentDetails.status': 1, 'paymentDetails.paymentDate': 1 });

// Pre-save middleware to ensure netAmount is calculated correctly
payrollSchema.pre('save', function(next) {
  if (this.earnings && this.deductions) {
    this.netAmount = this.earnings.totalAmount - this.deductions.totalDeductions;
  }
  next();
});

export const Payroll = mongoose.model<IPayroll>('Payroll', payrollSchema); 