import mongoose, { Schema } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}

export enum PaymentType {
  SALARY = 'salary',
  BONUS = 'bonus',
  EXPENSE = 'expense',
  REFUND = 'refund'
}

export interface IPaymentStatusHistory {
  status: PaymentStatus;
  timestamp: Date;
  note?: string;
  updatedBy: string;
  metadata?: Record<string, any>;
}

export interface IPayment {
  workerId: string;
  timesheetId?: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  statusHistory: IPaymentStatusHistory[];
  paymentDate?: Date;
  dueDate?: Date;
  processedDate?: Date;
  reference: string;
  description: string;
  metadata: {
    paymentMethod: string;
    transactionId?: string;
    authorizationCode?: string;
    invoiceNumber?: string;
    refundAmount?: number;
    disputeReason?: string;
    taxDetails?: {
      taxRate: number;
      taxAmount: number;
    };
  };
}

const paymentSchema = new Schema<IPayment>({
  workerId: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  timesheetId: {
    type: String,
    ref: 'Timesheet',
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(PaymentType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    note: String,
    updatedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    metadata: Schema.Types.Mixed
  }],
  paymentDate: Date,
  dueDate: Date,
  processedDate: Date,
  reference: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    paymentMethod: {
      type: String,
      required: true
    },
    transactionId: String,
    authorizationCode: String,
    invoiceNumber: String,
    refundAmount: Number,
    disputeReason: String,
    taxDetails: {
      taxRate: Number,
      taxAmount: Number
    }
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ status: 1, paymentDate: 1 });
paymentSchema.index({ 'metadata.invoiceNumber': 1 });
paymentSchema.index({ createdAt: 1 });
paymentSchema.index({ 'statusHistory.timestamp': 1 });

// Pre-save middleware to update status history
paymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.get('updatedBy') || this.workerId,
      metadata: this.get('statusMetadata') || {}
    });
  }
  next();
});

// Methods
paymentSchema.methods.updateStatus = async function(
  newStatus: PaymentStatus,
  updatedBy: string,
  note?: string,
  metadata?: Record<string, any>
) {
  this.status = newStatus;
  this.set('updatedBy', updatedBy);
  this.set('statusMetadata', metadata);
  if (newStatus === PaymentStatus.COMPLETED) {
    this.processedDate = new Date();
  }
  await this.save();
};

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema); 