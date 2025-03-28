import mongoose, { Document, Schema } from 'mongoose';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  VOID = 'void'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  CASH = 'cash',
  CHECK = 'check',
  OTHER = 'other'
}

export enum TaxType {
  VAT = 'vat',
  GST = 'gst',
  SALES_TAX = 'sales_tax',
  INCOME_TAX = 'income_tax',
  NONE = 'none'
}

export enum ReminderStatus {
  NOT_SENT = 'not_sent',
  SENT = 'sent',
  SCHEDULED = 'scheduled'
}

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  jobId?: Schema.Types.ObjectId;
  timesheetId?: Schema.Types.ObjectId;
  shiftId?: Schema.Types.ObjectId;
}

export interface IPaymentRecord {
  amount: number;
  date: Date;
  method: PaymentMethod;
  reference: string;
  notes?: string;
  processedBy?: Schema.Types.ObjectId;
  transactionId?: string;
  receiptUrl?: string;
}

export interface IReminder {
  type: 'first_reminder' | 'second_reminder' | 'final_notice';
  scheduledDate: Date;
  sentDate?: Date;
  status: ReminderStatus;
  sentBy?: Schema.Types.ObjectId;
  notes?: string;
  emailTemplate?: string;
  emailSent?: boolean;
  emailRecipients?: string[];
}

export interface ITaxSummary {
  taxType: TaxType;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  clientId: Schema.Types.ObjectId;
  workerId?: Schema.Types.ObjectId;
  jobId?: Schema.Types.ObjectId;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  items: IInvoiceItem[];
  subtotal: number;
  taxSummary: ITaxSummary[];
  totalTax: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    reason?: string;
  };
  total: number;
  amountPaid: number;
  amountDue: number;
  payments: IPaymentRecord[];
  billingDetails: {
    companyName: string;
    contactName: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    email: string;
    phone: string;
    taxId?: string;
  };
  paymentDetails: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
    iban?: string;
    swift?: string;
    paymentTerms: string;
    acceptedPaymentMethods: PaymentMethod[];
  };
  notes?: string;
  termsAndConditions?: string;
  reminders: IReminder[];
  attachments?: Array<{
    name: string;
    url: string;
    uploadDate: Date;
    type: string;
  }>;
  metadata: {
    generatedBy: Schema.Types.ObjectId;
    generatedAt: Date;
    lastUpdatedBy?: Schema.Types.ObjectId;
    lastUpdatedAt?: Date;
    emailSent: boolean;
    emailSentAt?: Date;
    emailSentTo?: string[];
    emailSentBy?: Schema.Types.ObjectId;
    pdfGenerated: boolean;
    pdfGeneratedAt?: Date;
    pdfUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      index: true
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true
    },
    items: [{
      description: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      },
      unitPrice: {
        type: Number,
        required: true,
        min: 0
      },
      taxRate: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      taxAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      subtotal: {
        type: Number,
        required: true,
        min: 0
      },
      total: {
        type: Number,
        required: true,
        min: 0
      },
      jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
      },
      timesheetId: {
        type: Schema.Types.ObjectId,
        ref: 'Timesheet'
      },
      shiftId: {
        type: Schema.Types.ObjectId,
        ref: 'Shift'
      }
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxSummary: [{
      taxType: {
        type: String,
        enum: Object.values(TaxType),
        required: true
      },
      taxRate: {
        type: Number,
        required: true,
        min: 0
      },
      taxableAmount: {
        type: Number,
        required: true,
        min: 0
      },
      taxAmount: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    totalTax: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: {
        type: Number,
        min: 0
      },
      amount: {
        type: Number,
        min: 0
      },
      reason: String
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0
    },
    payments: [{
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      date: {
        type: Date,
        required: true,
        default: Date.now
      },
      method: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true
      },
      reference: {
        type: String,
        required: true
      },
      notes: String,
      processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      transactionId: String,
      receiptUrl: String
    }],
    billingDetails: {
      companyName: {
        type: String,
        required: true
      },
      contactName: {
        type: String,
        required: true
      },
      address: {
        street: {
          type: String,
          required: true
        },
        city: {
          type: String,
          required: true
        },
        state: {
          type: String,
          required: true
        },
        postalCode: {
          type: String,
          required: true
        },
        country: {
          type: String,
          required: true
        }
      },
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      taxId: String
    },
    paymentDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      sortCode: String,
      iban: String,
      swift: String,
      paymentTerms: {
        type: String,
        required: true,
        default: 'Net 30'
      },
      acceptedPaymentMethods: [{
        type: String,
        enum: Object.values(PaymentMethod)
      }]
    },
    notes: String,
    termsAndConditions: String,
    reminders: [{
      type: {
        type: String,
        enum: ['first_reminder', 'second_reminder', 'final_notice'],
        required: true
      },
      scheduledDate: {
        type: Date,
        required: true
      },
      sentDate: Date,
      status: {
        type: String,
        enum: Object.values(ReminderStatus),
        default: ReminderStatus.NOT_SENT
      },
      sentBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String,
      emailTemplate: String,
      emailSent: Boolean,
      emailRecipients: [String]
    }],
    attachments: [{
      name: String,
      url: String,
      uploadDate: {
        type: Date,
        default: Date.now
      },
      type: String
    }],
    metadata: {
      generatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      generatedAt: {
        type: Date,
        required: true,
        default: Date.now
      },
      lastUpdatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      lastUpdatedAt: Date,
      emailSent: {
        type: Boolean,
        default: false
      },
      emailSentAt: Date,
      emailSentTo: [String],
      emailSentBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      pdfGenerated: {
        type: Boolean,
        default: false
      },
      pdfGeneratedAt: Date,
      pdfUrl: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ workerId: 1, status: 1 });
invoiceSchema.index({ issueDate: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ 'metadata.generatedBy': 1 });
invoiceSchema.index({ 'payments.date': 1 });

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calculate total tax
  this.totalTax = this.taxSummary.reduce((sum, tax) => sum + tax.taxAmount, 0);
  
  // Calculate discount amount if percentage
  if (this.discount && this.discount.type === 'percentage') {
    this.discount.amount = (this.subtotal * this.discount.value) / 100;
  }
  
  // Calculate total
  this.total = this.subtotal + this.totalTax - (this.discount ? this.discount.amount : 0);
  
  // Calculate amount paid
  this.amountPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate amount due
  this.amountDue = this.total - this.amountPaid;
  
  // Update status based on payments
  if (this.amountDue <= 0) {
    this.status = InvoiceStatus.PAID;
  } else if (this.amountPaid > 0) {
    this.status = InvoiceStatus.PARTIALLY_PAID;
  } else if (this.status === InvoiceStatus.DRAFT) {
    // Don't change status if it's still a draft
  } else if (new Date() > this.dueDate) {
    this.status = InvoiceStatus.OVERDUE;
  } else {
    this.status = InvoiceStatus.PENDING;
  }
  
  next();
});

// Methods
invoiceSchema.methods.addPayment = function(paymentData: IPaymentRecord) {
  this.payments.push(paymentData);
  return this.save();
};

invoiceSchema.methods.generatePdf = async function() {
  // Implementation would generate a PDF of the invoice
  // For now, this is a placeholder
  this.metadata.pdfGenerated = true;
  this.metadata.pdfGeneratedAt = new Date();
  this.metadata.pdfUrl = `https://example.com/invoices/${this.invoiceNumber}.pdf`;
  return this.save();
};

invoiceSchema.methods.sendEmail = async function(recipients: string[]) {
  // Implementation would send an email with the invoice
  // For now, this is a placeholder
  this.metadata.emailSent = true;
  this.metadata.emailSentAt = new Date();
  this.metadata.emailSentTo = recipients;
  return this.save();
};

invoiceSchema.methods.scheduleReminders = function() {
  // Implementation would schedule reminders based on due date
  // For now, this is a placeholder
  const dueDate = new Date(this.dueDate);
  
  // First reminder: 3 days before due date
  const firstReminderDate = new Date(dueDate);
  firstReminderDate.setDate(dueDate.getDate() - 3);
  
  // Second reminder: on due date
  const secondReminderDate = new Date(dueDate);
  
  // Final notice: 7 days after due date
  const finalNoticeDate = new Date(dueDate);
  finalNoticeDate.setDate(dueDate.getDate() + 7);
  
  this.reminders = [
    {
      type: 'first_reminder',
      scheduledDate: firstReminderDate,
      status: ReminderStatus.SCHEDULED
    },
    {
      type: 'second_reminder',
      scheduledDate: secondReminderDate,
      status: ReminderStatus.SCHEDULED
    },
    {
      type: 'final_notice',
      scheduledDate: finalNoticeDate,
      status: ReminderStatus.SCHEDULED
    }
  ];
  
  return this.save();
};

// Static methods
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const prefix = `INV-${currentYear}${currentMonth.toString().padStart(2, '0')}`;
  
  // Find the highest invoice number with this prefix
  const lastInvoice = await this.findOne(
    { invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }
  );
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema); 