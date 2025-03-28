import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for subscription plan type
 */
export enum SubscriptionPlanType {
  FREE = 'FREE',
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAST_DUE = 'PAST_DUE',
  TRIAL = 'TRIAL',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED'
}

/**
 * Enum for billing cycle
 */
export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUAL = 'BIANNUAL',
  ANNUAL = 'ANNUAL',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for payment status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Interface for subscription feature
 */
export interface ISubscriptionFeature {
  name: string;
  code: string;
  description?: string;
  value: number | boolean | string;
  unit?: string;
  isUnlimited?: boolean;
}

/**
 * Interface for subscription plan
 */
export interface ISubscriptionPlan {
  name: string;
  code: string;
  type: SubscriptionPlanType;
  description?: string;
  isActive: boolean;
  isPublic: boolean;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  trialDays: number;
  features: ISubscriptionFeature[];
  maxUsers?: number;
  setupFee?: number;
  discounts?: Array<{
    code: string;
    description?: string;
    value: number;
    isPercentage: boolean;
    validFrom?: Date;
    validUntil?: Date;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Interface for subscription payment
 */
export interface ISubscriptionPayment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodId?: Types.ObjectId | string;
  paymentDate?: Date;
  dueDate: Date;
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for subscription
 */
export interface ISubscription extends Document {
  // Relationships
  userId: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  planId: Types.ObjectId | string;
  
  // Core data
  plan: ISubscriptionPlan;
  status: SubscriptionStatus;
  
  // Dates
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  cancelledDate?: Date;
  nextBillingDate?: Date;
  
  // Billing
  billingCycle: BillingCycle;
  billingAmount: number;
  currency: string;
  autoRenew: boolean;
  paymentMethodId?: Types.ObjectId | string;
  
  // Usage
  currentUsers: number;
  maxUsers?: number;
  
  // Payments
  payments: ISubscriptionPayment[];
  
  // External references
  externalId?: string;
  externalProvider?: string;
  externalData?: Record<string, any>;
  
  // Metadata
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  activate(): Promise<ISubscription>;
  deactivate(): Promise<ISubscription>;
  cancel(immediate?: boolean): Promise<ISubscription>;
  renew(): Promise<ISubscription>;
  changePlan(newPlanId: Types.ObjectId | string): Promise<ISubscription>;
  addPayment(payment: Partial<ISubscriptionPayment>): Promise<ISubscription>;
  updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<ISubscription>;
  isFeatureAvailable(featureCode: string): boolean;
  getFeatureValue(featureCode: string): number | boolean | string | undefined;
  isActive(): boolean;
  isInTrial(): boolean;
  daysUntilExpiration(): number;
}

/**
 * Schema for subscription
 */
const subscriptionSchema = new Schema<ISubscription>(
  {
    // Relationships
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Plan ID is required'],
      index: true
    },
    
    // Core data
    plan: {
      name: {
        type: String,
        required: true
      },
      code: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: Object.values(SubscriptionPlanType),
        required: true
      },
      description: {
        type: String
      },
      isActive: {
        type: Boolean,
        default: true
      },
      isPublic: {
        type: Boolean,
        default: true
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        required: true,
        default: 'USD'
      },
      billingCycle: {
        type: String,
        enum: Object.values(BillingCycle),
        required: true
      },
      trialDays: {
        type: Number,
        default: 0,
        min: 0
      },
      features: [{
        name: {
          type: String,
          required: true
        },
        code: {
          type: String,
          required: true
        },
        description: {
          type: String
        },
        value: {
          type: Schema.Types.Mixed,
          required: true
        },
        unit: {
          type: String
        },
        isUnlimited: {
          type: Boolean,
          default: false
        }
      }],
      maxUsers: {
        type: Number
      },
      setupFee: {
        type: Number,
        min: 0
      },
      discounts: [{
        code: {
          type: String,
          required: true
        },
        description: {
          type: String
        },
        value: {
          type: Number,
          required: true,
          min: 0
        },
        isPercentage: {
          type: Boolean,
          default: true
        },
        validFrom: {
          type: Date
        },
        validUntil: {
          type: Date
        }
      }],
      metadata: {
        type: Map,
        of: Schema.Types.Mixed
      }
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.PENDING,
      required: true,
      index: true
    },
    
    // Dates
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    endDate: {
      type: Date,
      index: true
    },
    trialEndDate: {
      type: Date,
      index: true
    },
    cancelledDate: {
      type: Date
    },
    nextBillingDate: {
      type: Date,
      index: true
    },
    
    // Billing
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      required: true
    },
    billingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod'
    },
    
    // Usage
    currentUsers: {
      type: Number,
      default: 1,
      min: 0
    },
    maxUsers: {
      type: Number
    },
    
    // Payments
    payments: [{
      id: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: Object.values(PaymentStatus),
        required: true
      },
      paymentMethodId: {
        type: Schema.Types.ObjectId,
        ref: 'PaymentMethod'
      },
      paymentDate: {
        type: Date
      },
      dueDate: {
        type: Date,
        required: true
      },
      invoiceNumber: {
        type: String
      },
      invoiceUrl: {
        type: String
      },
      receiptUrl: {
        type: String
      },
      description: {
        type: String
      },
      metadata: {
        type: Map,
        of: Schema.Types.Mixed
      }
    }],
    
    // External references
    externalId: {
      type: String,
      index: true
    },
    externalProvider: {
      type: String,
      index: true
    },
    externalData: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Metadata
    notes: {
      type: String
    },
    tags: [{
      type: String,
      index: true
    }],
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ companyId: 1, status: 1 });
subscriptionSchema.index({ 'plan.type': 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, status: 1, autoRenew: 1 });

// Calculate next billing date based on billing cycle
subscriptionSchema.pre('save', function(next) {
  const subscription = this as ISubscription;
  
  // Only calculate if this is a new subscription or billing cycle changed
  if (subscription.isNew || subscription.isModified('billingCycle') || 
      subscription.isModified('startDate')) {
    
    const startDate = new Date(subscription.startDate);
    let nextBillingDate: Date | undefined;
    
    // Calculate next billing date based on billing cycle
    switch (subscription.billingCycle) {
      case BillingCycle.MONTHLY:
        nextBillingDate = new Date(startDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        break;
        
      case BillingCycle.QUARTERLY:
        nextBillingDate = new Date(startDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        break;
        
      case BillingCycle.BIANNUAL:
        nextBillingDate = new Date(startDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
        break;
        
      case BillingCycle.ANNUAL:
        nextBillingDate = new Date(startDate);
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        break;
        
      case BillingCycle.CUSTOM:
        // Custom billing cycle requires manual setting of nextBillingDate
        break;
    }
    
    if (nextBillingDate) {
      subscription.nextBillingDate = nextBillingDate;
    }
  }
  
  // Calculate trial end date if trial days > 0 and this is a new subscription
  if (subscription.isNew && subscription.plan.trialDays > 0 && !subscription.trialEndDate) {
    const trialEndDate = new Date(subscription.startDate);
    trialEndDate.setDate(trialEndDate.getDate() + subscription.plan.trialDays);
    subscription.trialEndDate = trialEndDate;
    
    // Set status to TRIAL if it's a new subscription with trial days
    subscription.status = SubscriptionStatus.TRIAL;
  }
  
  next();
});

/**
 * Activate subscription
 */
subscriptionSchema.methods.activate = async function(): Promise<ISubscription> {
  this.status = SubscriptionStatus.ACTIVE;
  return this.save();
};

/**
 * Deactivate subscription
 */
subscriptionSchema.methods.deactivate = async function(): Promise<ISubscription> {
  this.status = SubscriptionStatus.INACTIVE;
  return this.save();
};

/**
 * Cancel subscription
 */
subscriptionSchema.methods.cancel = async function(immediate: boolean = false): Promise<ISubscription> {
  this.cancelledDate = new Date();
  
  if (immediate) {
    this.status = SubscriptionStatus.CANCELLED;
    this.endDate = this.cancelledDate;
  } else {
    // Will be cancelled at the end of the billing period
    this.autoRenew = false;
    this.endDate = this.nextBillingDate;
  }
  
  return this.save();
};

/**
 * Renew subscription
 */
subscriptionSchema.methods.renew = async function(): Promise<ISubscription> {
  if (!this.nextBillingDate) {
    throw new Error('Cannot renew subscription without a next billing date');
  }
  
  // Set start date to the next billing date
  this.startDate = this.nextBillingDate;
  
  // Calculate new next billing date
  let nextBillingDate: Date | undefined;
  
  switch (this.billingCycle) {
    case BillingCycle.MONTHLY:
      nextBillingDate = new Date(this.startDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      break;
      
    case BillingCycle.QUARTERLY:
      nextBillingDate = new Date(this.startDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
      break;
      
    case BillingCycle.BIANNUAL:
      nextBillingDate = new Date(this.startDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
      break;
      
    case BillingCycle.ANNUAL:
      nextBillingDate = new Date(this.startDate);
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      break;
      
    case BillingCycle.CUSTOM:
      // Custom billing cycle requires manual setting of nextBillingDate
      break;
  }
  
  if (nextBillingDate) {
    this.nextBillingDate = nextBillingDate;
  }
  
  // Clear end date if it was set
  this.endDate = undefined;
  
  // Set status to active
  this.status = SubscriptionStatus.ACTIVE;
  
  return this.save();
};

/**
 * Change subscription plan
 */
subscriptionSchema.methods.changePlan = async function(
  newPlanId: Types.ObjectId | string
): Promise<ISubscription> {
  // Fetch the new plan
  const SubscriptionPlanModel = model('SubscriptionPlan');
  const newPlan = await SubscriptionPlanModel.findById(newPlanId);
  
  if (!newPlan) {
    throw new Error(`Subscription plan with ID ${newPlanId} not found`);
  }
  
  // Update plan details
  this.planId = newPlanId;
  this.plan = newPlan.toObject();
  
  // Update billing details
  this.billingCycle = newPlan.billingCycle;
  this.billingAmount = newPlan.price;
  this.currency = newPlan.currency;
  
  // Update max users if applicable
  if (newPlan.maxUsers !== undefined) {
    this.maxUsers = newPlan.maxUsers;
  }
  
  // Recalculate next billing date
  let nextBillingDate: Date | undefined;
  const today = new Date();
  
  switch (this.billingCycle) {
    case BillingCycle.MONTHLY:
      nextBillingDate = new Date(today);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      break;
      
    case BillingCycle.QUARTERLY:
      nextBillingDate = new Date(today);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
      break;
      
    case BillingCycle.BIANNUAL:
      nextBillingDate = new Date(today);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
      break;
      
    case BillingCycle.ANNUAL:
      nextBillingDate = new Date(today);
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      break;
      
    case BillingCycle.CUSTOM:
      // Custom billing cycle requires manual setting of nextBillingDate
      break;
  }
  
  if (nextBillingDate) {
    this.nextBillingDate = nextBillingDate;
  }
  
  return this.save();
};

/**
 * Add payment to subscription
 */
subscriptionSchema.methods.addPayment = async function(
  payment: Partial<ISubscriptionPayment>
): Promise<ISubscription> {
  if (!payment.id) {
    payment.id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
  
  if (!payment.status) {
    payment.status = PaymentStatus.PENDING;
  }
  
  if (!payment.dueDate) {
    payment.dueDate = new Date();
  }
  
  if (!payment.currency) {
    payment.currency = this.currency;
  }
  
  if (!this.payments) {
    this.payments = [];
  }
  
  this.payments.push(payment as ISubscriptionPayment);
  return this.save();
};

/**
 * Update payment status
 */
subscriptionSchema.methods.updatePaymentStatus = async function(
  paymentId: string,
  status: PaymentStatus
): Promise<ISubscription> {
  const paymentIndex = this.payments.findIndex(p => p.id === paymentId);
  
  if (paymentIndex === -1) {
    throw new Error(`Payment with ID ${paymentId} not found`);
  }
  
  this.payments[paymentIndex].status = status;
  
  // If payment is successful, update payment date
  if (status === PaymentStatus.PAID) {
    this.payments[paymentIndex].paymentDate = new Date();
  }
  
  return this.save();
};

/**
 * Check if a feature is available in the subscription
 */
subscriptionSchema.methods.isFeatureAvailable = function(featureCode: string): boolean {
  if (!this.plan || !this.plan.features) {
    return false;
  }
  
  const feature = this.plan.features.find(f => f.code === featureCode);
  
  if (!feature) {
    return false;
  }
  
  // If the feature is unlimited, it's available
  if (feature.isUnlimited) {
    return true;
  }
  
  // If the feature value is a boolean, return it
  if (typeof feature.value === 'boolean') {
    return feature.value;
  }
  
  // If the feature value is a number, check if it's greater than 0
  if (typeof feature.value === 'number') {
    return feature.value > 0;
  }
  
  // For string values, check if it's not empty
  if (typeof feature.value === 'string') {
    return feature.value.trim() !== '';
  }
  
  return false;
};

/**
 * Get the value of a feature
 */
subscriptionSchema.methods.getFeatureValue = function(featureCode: string): number | boolean | string | undefined {
  if (!this.plan || !this.plan.features) {
    return undefined;
  }
  
  const feature = this.plan.features.find(f => f.code === featureCode);
  
  if (!feature) {
    return undefined;
  }
  
  return feature.value;
};

/**
 * Check if subscription is active
 */
subscriptionSchema.methods.isActive = function(): boolean {
  return this.status === SubscriptionStatus.ACTIVE || this.status === SubscriptionStatus.TRIAL;
};

/**
 * Check if subscription is in trial period
 */
subscriptionSchema.methods.isInTrial = function(): boolean {
  return this.status === SubscriptionStatus.TRIAL;
};

/**
 * Calculate days until subscription expiration
 */
subscriptionSchema.methods.daysUntilExpiration = function(): number {
  if (!this.endDate) {
    return Infinity;
  }
  
  const today = new Date();
  const endDate = new Date(this.endDate);
  
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

/**
 * Find active subscriptions for a user
 */
subscriptionSchema.statics.findActiveForUser = async function(
  userId: string | Types.ObjectId
): Promise<ISubscription[]> {
  return this.find({
    userId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }
  }).sort({ startDate: -1 });
};

/**
 * Find subscriptions expiring soon
 */
subscriptionSchema.statics.findExpiringSoon = async function(
  daysThreshold: number = 7
): Promise<ISubscription[]> {
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
    endDate: { $lte: thresholdDate, $gt: today }
  }).sort({ endDate: 1 });
};

/**
 * Find subscriptions with upcoming billing
 */
subscriptionSchema.statics.findUpcomingBilling = async function(
  daysThreshold: number = 7
): Promise<ISubscription[]> {
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    status: SubscriptionStatus.ACTIVE,
    nextBillingDate: { $lte: thresholdDate, $gt: today },
    autoRenew: true
  }).sort({ nextBillingDate: 1 });
};

/**
 * Find subscriptions by plan type
 */
subscriptionSchema.statics.findByPlanType = async function(
  planType: SubscriptionPlanType
): Promise<ISubscription[]> {
  return this.find({
    'plan.type': planType,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] }
  }).sort({ startDate: -1 });
};

// Export the model
export const Subscription = model<ISubscription>('Subscription', subscriptionSchema); 