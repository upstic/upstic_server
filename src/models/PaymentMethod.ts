import { Schema, model, Document, Types } from 'mongoose';
import * as crypto from 'crypto';

/**
 * Enum for payment method type
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  CHECK = 'CHECK',
  CASH = 'CASH',
  CRYPTO = 'CRYPTO',
  OTHER = 'OTHER'
}

/**
 * Enum for payment method status
 */
export enum PaymentMethodStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  DECLINED = 'DECLINED',
  DELETED = 'DELETED'
}

/**
 * Enum for card type
 */
export enum CardType {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  DISCOVER = 'DISCOVER',
  DINERS = 'DINERS',
  JCB = 'JCB',
  UNIONPAY = 'UNIONPAY',
  OTHER = 'OTHER'
}

/**
 * Enum for bank account type
 */
export enum BankAccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  BUSINESS_CHECKING = 'BUSINESS_CHECKING',
  BUSINESS_SAVINGS = 'BUSINESS_SAVINGS'
}

/**
 * Interface for credit/debit card details
 */
export interface ICardDetails {
  cardholderName: string;
  cardType: CardType;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  encryptedData?: string; // Encrypted full card details if needed
}

/**
 * Interface for bank account details
 */
export interface IBankAccountDetails {
  accountHolderName: string;
  accountType: BankAccountType;
  bankName: string;
  routingNumber: string;
  last4: string;
  country: string;
  currency: string;
  encryptedData?: string; // Encrypted full account details if needed
}

/**
 * Interface for PayPal details
 */
export interface IPayPalDetails {
  email: string;
  paypalCustomerId?: string;
  agreementId?: string;
}

/**
 * Interface for payment method
 */
export interface IPaymentMethod extends Document {
  // Relationships
  userId: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  
  // Core data
  type: PaymentMethodType;
  nickname: string;
  description?: string;
  isDefault: boolean;
  status: PaymentMethodStatus;
  
  // Payment details (only one of these will be populated based on type)
  cardDetails?: ICardDetails;
  bankAccountDetails?: IBankAccountDetails;
  paypalDetails?: IPayPalDetails;
  otherDetails?: Record<string, any>;
  
  // External payment processor details
  processorId?: string; // ID in the payment processor system (e.g., Stripe)
  processorType?: string; // e.g., 'stripe', 'paypal', etc.
  processorData?: Record<string, any>; // Additional data from the processor
  
  // Verification
  isVerified: boolean;
  verificationDate?: Date;
  verificationMethod?: string;
  verificationDetails?: Record<string, any>;
  
  // Usage tracking
  lastUsed?: Date;
  usageCount: number;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  setAsDefault(): Promise<IPaymentMethod>;
  deactivate(): Promise<IPaymentMethod>;
  markAsVerified(method: string, details?: Record<string, any>): Promise<IPaymentMethod>;
  incrementUsage(): Promise<IPaymentMethod>;
  updateStatus(status: PaymentMethodStatus): Promise<IPaymentMethod>;
  delete(): Promise<IPaymentMethod>;
}

/**
 * Schema for payment method
 */
const paymentMethodSchema = new Schema<IPaymentMethod>(
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
    
    // Core data
    type: {
      type: String,
      enum: Object.values(PaymentMethodType),
      required: [true, 'Payment method type is required'],
      index: true
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(PaymentMethodStatus),
      default: PaymentMethodStatus.PENDING_VERIFICATION,
      required: true,
      index: true
    },
    
    // Payment details
    cardDetails: {
      cardholderName: {
        type: String,
        trim: true
      },
      cardType: {
        type: String,
        enum: Object.values(CardType)
      },
      last4: {
        type: String,
        trim: true
      },
      expiryMonth: {
        type: Number,
        min: 1,
        max: 12
      },
      expiryYear: {
        type: Number,
        min: 2000
      },
      billingAddress: {
        line1: {
          type: String,
          trim: true
        },
        line2: {
          type: String,
          trim: true
        },
        city: {
          type: String,
          trim: true
        },
        state: {
          type: String,
          trim: true
        },
        postalCode: {
          type: String,
          trim: true
        },
        country: {
          type: String,
          trim: true
        }
      },
      encryptedData: {
        type: String
      }
    },
    bankAccountDetails: {
      accountHolderName: {
        type: String,
        trim: true
      },
      accountType: {
        type: String,
        enum: Object.values(BankAccountType)
      },
      bankName: {
        type: String,
        trim: true
      },
      routingNumber: {
        type: String,
        trim: true
      },
      last4: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true
      },
      currency: {
        type: String,
        trim: true
      },
      encryptedData: {
        type: String
      }
    },
    paypalDetails: {
      email: {
        type: String,
        trim: true
      },
      paypalCustomerId: {
        type: String,
        trim: true
      },
      agreementId: {
        type: String,
        trim: true
      }
    },
    otherDetails: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // External payment processor details
    processorId: {
      type: String,
      trim: true,
      index: true
    },
    processorType: {
      type: String,
      trim: true,
      index: true
    },
    processorData: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationDate: {
      type: Date
    },
    verificationMethod: {
      type: String,
      trim: true
    },
    verificationDetails: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Usage tracking
    lastUsed: {
      type: Date
    },
    usageCount: {
      type: Number,
      default: 0
    },
    
    // Metadata
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
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ userId: 1, status: 1 });
paymentMethodSchema.index({ companyId: 1, isDefault: 1 });
paymentMethodSchema.index({ 'cardDetails.expiryYear': 1, 'cardDetails.expiryMonth': 1 });

// Validate payment details based on type
paymentMethodSchema.pre('validate', function(next) {
  const paymentMethod = this as IPaymentMethod;
  
  // Validate based on payment method type
  switch (paymentMethod.type) {
    case PaymentMethodType.CREDIT_CARD:
    case PaymentMethodType.DEBIT_CARD:
      if (!paymentMethod.cardDetails || !paymentMethod.cardDetails.cardholderName || 
          !paymentMethod.cardDetails.last4 || !paymentMethod.cardDetails.expiryMonth || 
          !paymentMethod.cardDetails.expiryYear) {
        return next(new Error('Card details are required for credit/debit card payment methods'));
      }
      break;
      
    case PaymentMethodType.BANK_ACCOUNT:
      if (!paymentMethod.bankAccountDetails || !paymentMethod.bankAccountDetails.accountHolderName || 
          !paymentMethod.bankAccountDetails.bankName || !paymentMethod.bankAccountDetails.last4) {
        return next(new Error('Bank account details are required for bank account payment methods'));
      }
      break;
      
    case PaymentMethodType.PAYPAL:
      if (!paymentMethod.paypalDetails || !paymentMethod.paypalDetails.email) {
        return next(new Error('PayPal email is required for PayPal payment methods'));
      }
      break;
      
    default:
      // Other payment methods may have custom validation requirements
      break;
  }
  
  next();
});

// Check for card expiration
paymentMethodSchema.pre('save', function(next) {
  const paymentMethod = this as IPaymentMethod;
  
  // Check if this is a card payment method
  if ((paymentMethod.type === PaymentMethodType.CREDIT_CARD || 
       paymentMethod.type === PaymentMethodType.DEBIT_CARD) && 
      paymentMethod.cardDetails) {
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Check if card is expired
    if (paymentMethod.cardDetails.expiryYear < currentYear || 
        (paymentMethod.cardDetails.expiryYear === currentYear && 
         paymentMethod.cardDetails.expiryMonth < currentMonth)) {
      
      paymentMethod.status = PaymentMethodStatus.EXPIRED;
    }
  }
  
  next();
});

// If setting as default, unset any other default payment methods for this user
paymentMethodSchema.pre('save', async function(next) {
  const paymentMethod = this as IPaymentMethod;
  
  if (paymentMethod.isDefault && 
      (paymentMethod.isModified('isDefault') || paymentMethod.isNew)) {
    
    try {
      const PaymentMethodModel = model<IPaymentMethod>('PaymentMethod');
      
      // Find other payment methods for this user/company and unset default
      const query: any = { _id: { $ne: paymentMethod._id } };
      
      if (paymentMethod.userId) {
        query.userId = paymentMethod.userId;
      }
      
      if (paymentMethod.companyId) {
        query.companyId = paymentMethod.companyId;
      }
      
      await PaymentMethodModel.updateMany(
        query,
        { $set: { isDefault: false } }
      );
      
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

/**
 * Set payment method as default
 */
paymentMethodSchema.methods.setAsDefault = async function(): Promise<IPaymentMethod> {
  this.isDefault = true;
  return this.save();
};

/**
 * Deactivate payment method
 */
paymentMethodSchema.methods.deactivate = async function(): Promise<IPaymentMethod> {
  this.status = PaymentMethodStatus.INACTIVE;
  return this.save();
};

/**
 * Mark payment method as verified
 */
paymentMethodSchema.methods.markAsVerified = async function(
  method: string,
  details?: Record<string, any>
): Promise<IPaymentMethod> {
  this.isVerified = true;
  this.verificationDate = new Date();
  this.verificationMethod = method;
  
  if (details) {
    this.verificationDetails = details;
  }
  
  this.status = PaymentMethodStatus.ACTIVE;
  return this.save();
};

/**
 * Increment usage count
 */
paymentMethodSchema.methods.incrementUsage = async function(): Promise<IPaymentMethod> {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

/**
 * Update payment method status
 */
paymentMethodSchema.methods.updateStatus = async function(
  status: PaymentMethodStatus
): Promise<IPaymentMethod> {
  this.status = status;
  return this.save();
};

/**
 * Delete payment method (soft delete)
 */
paymentMethodSchema.methods.delete = async function(): Promise<IPaymentMethod> {
  this.status = PaymentMethodStatus.DELETED;
  
  // If this was the default payment method, we need to clear that flag
  if (this.isDefault) {
    this.isDefault = false;
  }
  
  return this.save();
};

/**
 * Encrypt sensitive data
 */
paymentMethodSchema.statics.encryptData = function(data: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt sensitive data
 */
paymentMethodSchema.statics.decryptData = function(encryptedData: string, encryptionKey: string): string {
  const [ivHex, encryptedHex] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Find active payment methods for a user
 */
paymentMethodSchema.statics.findActiveForUser = async function(
  userId: string | Types.ObjectId
): Promise<IPaymentMethod[]> {
  return this.find({
    userId,
    status: PaymentMethodStatus.ACTIVE
  }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Find default payment method for a user
 */
paymentMethodSchema.statics.findDefaultForUser = async function(
  userId: string | Types.ObjectId
): Promise<IPaymentMethod | null> {
  return this.findOne({
    userId,
    isDefault: true,
    status: PaymentMethodStatus.ACTIVE
  });
};

/**
 * Find payment methods by processor ID
 */
paymentMethodSchema.statics.findByProcessorId = async function(
  processorId: string,
  processorType?: string
): Promise<IPaymentMethod | null> {
  const query: any = { processorId };
  
  if (processorType) {
    query.processorType = processorType;
  }
  
  return this.findOne(query);
};

/**
 * Find expiring cards
 */
paymentMethodSchema.statics.findExpiringCards = async function(
  monthsAhead: number = 1
): Promise<IPaymentMethod[]> {
  const now = new Date();
  const targetYear = now.getFullYear();
  let targetMonth = now.getMonth() + 1 + monthsAhead; // JavaScript months are 0-indexed
  
  // Adjust for month overflow
  let adjustedYear = targetYear;
  if (targetMonth > 12) {
    adjustedYear += Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;
    if (targetMonth === 0) {
      targetMonth = 12;
      adjustedYear -= 1;
    }
  }
  
  return this.find({
    $or: [
      { 
        type: PaymentMethodType.CREDIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        'cardDetails.expiryYear': adjustedYear,
        'cardDetails.expiryMonth': targetMonth
      },
      {
        type: PaymentMethodType.DEBIT_CARD,
        status: PaymentMethodStatus.ACTIVE,
        'cardDetails.expiryYear': adjustedYear,
        'cardDetails.expiryMonth': targetMonth
      }
    ]
  });
};

// Export the model
export const PaymentMethod = model<IPaymentMethod>('PaymentMethod', paymentMethodSchema); 