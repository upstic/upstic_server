import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Enum for tax type
 */
export enum TaxType {
  VAT = 'VAT',
  GST = 'GST',
  SALES_TAX = 'SALES_TAX',
  SERVICE_TAX = 'SERVICE_TAX',
  INCOME_TAX = 'INCOME_TAX',
  WITHHOLDING_TAX = 'WITHHOLDING_TAX',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for tax calculation method
 */
export enum TaxCalculationMethod {
  INCLUSIVE = 'INCLUSIVE',
  EXCLUSIVE = 'EXCLUSIVE'
}

/**
 * Enum for tax jurisdiction level
 */
export enum TaxJurisdictionLevel {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  COUNTY = 'COUNTY',
  CITY = 'CITY',
  DISTRICT = 'DISTRICT',
  POSTAL_CODE = 'POSTAL_CODE'
}

/**
 * Interface for tax rate
 */
export interface ITaxRate {
  name: string;
  code: string;
  type: TaxType;
  rate: number;
  calculationMethod: TaxCalculationMethod;
  description?: string;
  isCompound: boolean;
  priority: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  jurisdictions?: Array<{
    level: TaxJurisdictionLevel;
    code: string;
    name: string;
  }>;
  productCategories?: string[];
  customerCategories?: string[];
  minAmount?: number;
  maxAmount?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for tax exemption
 */
export interface ITaxExemption {
  name: string;
  code: string;
  description?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  issuedBy?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  taxTypes: TaxType[];
  jurisdictions?: Array<{
    level: TaxJurisdictionLevel;
    code: string;
    name: string;
  }>;
  isActive: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for tax settings
 */
export interface ITaxSettings extends Document {
  // Core settings
  companyId?: Types.ObjectId | string;
  isGlobalDefault: boolean;
  name: string;
  description?: string;
  
  // Tax registration
  taxRegistrationNumber?: string;
  taxOffice?: string;
  
  // Tax rates
  taxRates: ITaxRate[];
  
  // Tax exemptions
  taxExemptions: ITaxExemption[];
  
  // Default settings
  defaultTaxType: TaxType;
  defaultCalculationMethod: TaxCalculationMethod;
  roundingMethod: 'UP' | 'DOWN' | 'NEAREST';
  roundingPrecision: number;
  
  // Display settings
  displayTaxTotals: boolean;
  displayTaxRateBreakdown: boolean;
  
  // External integrations
  externalTaxServiceEnabled: boolean;
  externalTaxServiceProvider?: string;
  externalTaxServiceConfig?: Record<string, any>;
  
  // Metadata
  isActive: boolean;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  activate(): Promise<ITaxSettings>;
  deactivate(): Promise<ITaxSettings>;
  addTaxRate(taxRate: ITaxRate): Promise<ITaxSettings>;
  updateTaxRate(code: string, taxRate: Partial<ITaxRate>): Promise<ITaxSettings>;
  removeTaxRate(code: string): Promise<ITaxSettings>;
  addTaxExemption(taxExemption: ITaxExemption): Promise<ITaxSettings>;
  updateTaxExemption(code: string, taxExemption: Partial<ITaxExemption>): Promise<ITaxSettings>;
  removeTaxExemption(code: string): Promise<ITaxSettings>;
  roundTax(amount: number): number;
  calculateTax(amount: number, options?: {
    taxType?: TaxType;
    productCategory?: string;
    customerCategory?: string;
    jurisdictions?: Array<{
      level: TaxJurisdictionLevel;
      code: string;
    }>;
    exemptions?: string[];
  }): {
    totalTax: number;
    taxBreakdown: Array<{
      name: string;
      code: string;
      type: TaxType;
      rate: number;
      amount: number;
    }>;
    taxableAmount: number;
    totalAmount: number;
  };
}

/**
 * Interface for tax settings model with static methods
 */
export interface ITaxSettingsModel extends Model<ITaxSettings> {
  getDefaultSettings(): Promise<ITaxSettings>;
  getSettingsForCompany(companyId: Types.ObjectId | string): Promise<ITaxSettings>;
  findActiveTaxRates(options?: {
    taxType?: TaxType;
    jurisdictions?: Array<{
      level: TaxJurisdictionLevel;
      code: string;
    }>;
    productCategory?: string;
    customerCategory?: string;
    date?: Date;
  }): Promise<ITaxRate[]>;
}

/**
 * Schema for tax settings
 */
const taxSettingsSchema = new Schema<ITaxSettings>(
  {
    // Core settings
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    isGlobalDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Tax settings name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    
    // Tax registration
    taxRegistrationNumber: {
      type: String,
      trim: true
    },
    taxOffice: {
      type: String,
      trim: true
    },
    
    // Tax rates
    taxRates: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      code: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        enum: Object.values(TaxType),
        required: true
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      calculationMethod: {
        type: String,
        enum: Object.values(TaxCalculationMethod),
        required: true
      },
      description: {
        type: String,
        trim: true
      },
      isCompound: {
        type: Boolean,
        default: false
      },
      priority: {
        type: Number,
        default: 0
      },
      isActive: {
        type: Boolean,
        default: true
      },
      effectiveFrom: {
        type: Date,
        required: true,
        default: Date.now
      },
      effectiveTo: {
        type: Date
      },
      jurisdictions: [{
        level: {
          type: String,
          enum: Object.values(TaxJurisdictionLevel),
          required: true
        },
        code: {
          type: String,
          required: true,
          trim: true
        },
        name: {
          type: String,
          required: true,
          trim: true
        }
      }],
      productCategories: [{
        type: String,
        trim: true
      }],
      customerCategories: [{
        type: String,
        trim: true
      }],
      minAmount: {
        type: Number,
        min: 0
      },
      maxAmount: {
        type: Number,
        min: 0
      },
      metadata: {
        type: Map,
        of: Schema.Types.Mixed
      }
    }],
    
    // Tax exemptions
    taxExemptions: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      code: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      certificateNumber: {
        type: String,
        trim: true
      },
      certificateUrl: {
        type: String,
        trim: true
      },
      issuedBy: {
        type: String,
        trim: true
      },
      issuedDate: {
        type: Date
      },
      expiryDate: {
        type: Date
      },
      taxTypes: [{
        type: String,
        enum: Object.values(TaxType),
        required: true
      }],
      jurisdictions: [{
        level: {
          type: String,
          enum: Object.values(TaxJurisdictionLevel),
          required: true
        },
        code: {
          type: String,
          required: true,
          trim: true
        },
        name: {
          type: String,
          required: true,
          trim: true
        }
      }],
      isActive: {
        type: Boolean,
        default: true
      },
      notes: {
        type: String,
        trim: true
      },
      metadata: {
        type: Map,
        of: Schema.Types.Mixed
      }
    }],
    
    // Default settings
    defaultTaxType: {
      type: String,
      enum: Object.values(TaxType),
      default: TaxType.SALES_TAX
    },
    defaultCalculationMethod: {
      type: String,
      enum: Object.values(TaxCalculationMethod),
      default: TaxCalculationMethod.EXCLUSIVE
    },
    roundingMethod: {
      type: String,
      enum: ['UP', 'DOWN', 'NEAREST'],
      default: 'NEAREST'
    },
    roundingPrecision: {
      type: Number,
      default: 2,
      min: 0,
      max: 6
    },
    
    // Display settings
    displayTaxTotals: {
      type: Boolean,
      default: true
    },
    displayTaxRateBreakdown: {
      type: Boolean,
      default: true
    },
    
    // External integrations
    externalTaxServiceEnabled: {
      type: Boolean,
      default: false
    },
    externalTaxServiceProvider: {
      type: String,
      trim: true
    },
    externalTaxServiceConfig: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Metadata
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true,
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
taxSettingsSchema.index({ companyId: 1, isActive: 1 });
taxSettingsSchema.index({ isGlobalDefault: 1, isActive: 1 });
taxSettingsSchema.index({ 'taxRates.code': 1 });
taxSettingsSchema.index({ 'taxRates.type': 1, 'taxRates.isActive': 1 });
taxSettingsSchema.index({ 'taxExemptions.code': 1 });

// Ensure only one global default
taxSettingsSchema.pre('save', async function(this: ITaxSettings, next) {
  if (this.isGlobalDefault && (this.isModified('isGlobalDefault') || this.isNew)) {
    try {
      const TaxSettingsModel = model<ITaxSettings>('TaxSettings');
      
      // Find other tax settings that are global default and unset them
      await TaxSettingsModel.updateMany(
        { _id: { $ne: this._id }, isGlobalDefault: true },
        { $set: { isGlobalDefault: false } }
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
 * Activate tax settings
 */
taxSettingsSchema.methods.activate = async function(this: ITaxSettings): Promise<ITaxSettings> {
  this.isActive = true;
  return this.save();
};

/**
 * Deactivate tax settings
 */
taxSettingsSchema.methods.deactivate = async function(this: ITaxSettings): Promise<ITaxSettings> {
  this.isActive = false;
  return this.save();
};

/**
 * Add tax rate
 */
taxSettingsSchema.methods.addTaxRate = async function(
  this: ITaxSettings,
  taxRate: ITaxRate
): Promise<ITaxSettings> {
  if (!taxRate.code) {
    throw new Error('Tax rate code is required');
  }
  
  // Check if tax rate with same code already exists
  const existingIndex = this.taxRates.findIndex(tr => tr.code === taxRate.code);
  
  if (existingIndex >= 0) {
    throw new Error(`Tax rate with code ${taxRate.code} already exists`);
  }
  
  this.taxRates.push(taxRate);
  return this.save();
};

/**
 * Update tax rate
 */
taxSettingsSchema.methods.updateTaxRate = async function(
  this: ITaxSettings,
  code: string,
  taxRate: Partial<ITaxRate>
): Promise<ITaxSettings> {
  const taxRateIndex = this.taxRates.findIndex(tr => tr.code === code);
  
  if (taxRateIndex === -1) {
    throw new Error(`Tax rate with code ${code} not found`);
  }
  
  // Update tax rate properties
  Object.assign(this.taxRates[taxRateIndex], taxRate);
  
  return this.save();
};

/**
 * Remove tax rate
 */
taxSettingsSchema.methods.removeTaxRate = async function(
  this: ITaxSettings,
  code: string
): Promise<ITaxSettings> {
  const taxRateIndex = this.taxRates.findIndex(tr => tr.code === code);
  
  if (taxRateIndex === -1) {
    throw new Error(`Tax rate with code ${code} not found`);
  }
  
  this.taxRates.splice(taxRateIndex, 1);
  return this.save();
};

/**
 * Add tax exemption
 */
taxSettingsSchema.methods.addTaxExemption = async function(
  this: ITaxSettings,
  taxExemption: ITaxExemption
): Promise<ITaxSettings> {
  if (!taxExemption.code) {
    throw new Error('Tax exemption code is required');
  }
  
  // Check if tax exemption with same code already exists
  const existingIndex = this.taxExemptions.findIndex(te => te.code === taxExemption.code);
  
  if (existingIndex >= 0) {
    throw new Error(`Tax exemption with code ${taxExemption.code} already exists`);
  }
  
  this.taxExemptions.push(taxExemption);
  return this.save();
};

/**
 * Update tax exemption
 */
taxSettingsSchema.methods.updateTaxExemption = async function(
  this: ITaxSettings,
  code: string,
  taxExemption: Partial<ITaxExemption>
): Promise<ITaxSettings> {
  const taxExemptionIndex = this.taxExemptions.findIndex(te => te.code === code);
  
  if (taxExemptionIndex === -1) {
    throw new Error(`Tax exemption with code ${code} not found`);
  }
  
  // Update tax exemption properties
  Object.assign(this.taxExemptions[taxExemptionIndex], taxExemption);
  
  return this.save();
};

/**
 * Remove tax exemption
 */
taxSettingsSchema.methods.removeTaxExemption = async function(
  this: ITaxSettings,
  code: string
): Promise<ITaxSettings> {
  const taxExemptionIndex = this.taxExemptions.findIndex(te => te.code === code);
  
  if (taxExemptionIndex === -1) {
    throw new Error(`Tax exemption with code ${code} not found`);
  }
  
  this.taxExemptions.splice(taxExemptionIndex, 1);
  return this.save();
};

/**
 * Calculate tax
 */
taxSettingsSchema.methods.calculateTax = function(
  this: ITaxSettings,
  amount: number,
  options: {
    taxType?: TaxType;
    productCategory?: string;
    customerCategory?: string;
    jurisdictions?: Array<{
      level: TaxJurisdictionLevel;
      code: string;
    }>;
    exemptions?: string[];
  } = {}
): {
  totalTax: number;
  taxBreakdown: Array<{
    name: string;
    code: string;
    type: TaxType;
    rate: number;
    amount: number;
  }>;
  taxableAmount: number;
  totalAmount: number;
} {
  // Default values
  const taxType = options.taxType || this.defaultTaxType;
  const now = new Date();
  
  // Filter active tax rates
  let applicableTaxRates = this.taxRates.filter(tr => {
    // Check if tax rate is active
    if (!tr.isActive) {
      return false;
    }
    
    // Check if tax rate is of the requested type
    if (taxType && tr.type !== taxType) {
      return false;
    }
    
    // Check if tax rate is effective for the current date
    if (tr.effectiveFrom > now) {
      return false;
    }
    
    if (tr.effectiveTo && tr.effectiveTo < now) {
      return false;
    }
    
    // Check if amount is within range
    if (tr.minAmount !== undefined && amount < tr.minAmount) {
      return false;
    }
    
    if (tr.maxAmount !== undefined && amount > tr.maxAmount) {
      return false;
    }
    
    // Check product category if specified
    if (options.productCategory && 
        tr.productCategories && 
        tr.productCategories.length > 0 && 
        !tr.productCategories.includes(options.productCategory)) {
      return false;
    }
    
    // Check customer category if specified
    if (options.customerCategory && 
        tr.customerCategories && 
        tr.customerCategories.length > 0 && 
        !tr.customerCategories.includes(options.customerCategory)) {
      return false;
    }
    
    // Check jurisdictions if specified
    if (options.jurisdictions && 
        options.jurisdictions.length > 0 && 
        tr.jurisdictions && 
        tr.jurisdictions.length > 0) {
      
      // Check if any of the requested jurisdictions match
      const hasMatchingJurisdiction = options.jurisdictions.some(reqJuris => {
        return tr.jurisdictions!.some(trJuris => 
          trJuris.level === reqJuris.level && trJuris.code === reqJuris.code
        );
      });
      
      if (!hasMatchingJurisdiction) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort by priority (higher priority first)
  applicableTaxRates.sort((a, b) => b.priority - a.priority);
  
  // Check for exemptions
  if (options.exemptions && options.exemptions.length > 0) {
    const exemptionCodes = options.exemptions;
    
    // Find applicable exemptions
    const applicableExemptions = this.taxExemptions.filter(te => 
      te.isActive && 
      exemptionCodes.includes(te.code) && 
      (!te.expiryDate || te.expiryDate > now)
    );
    
    // Filter out tax rates that are exempted
    applicableTaxRates = applicableTaxRates.filter(tr => {
      // Check if any exemption applies to this tax rate
      return !applicableExemptions.some(exemption => 
        exemption.taxTypes.includes(tr.type) && 
        (!exemption.jurisdictions || exemption.jurisdictions.length === 0 || 
         !tr.jurisdictions || tr.jurisdictions.length === 0 || 
         exemption.jurisdictions.some(ej => 
           tr.jurisdictions!.some(tj => 
             tj.level === ej.level && tj.code === ej.code
           )
         ))
      );
    });
  }
  
  // Calculate taxes
  let taxableAmount = amount;
  let totalTax = 0;
  const taxBreakdown: Array<{
    name: string;
    code: string;
    type: TaxType;
    rate: number;
    amount: number;
  }> = [];
  
  // Process non-compound taxes first
  const nonCompoundTaxes = applicableTaxRates.filter(tr => !tr.isCompound);
  const compoundTaxes = applicableTaxRates.filter(tr => tr.isCompound);
  
  // Calculate non-compound taxes
  for (const taxRate of nonCompoundTaxes) {
    const taxAmount = this.roundTax(taxableAmount * (taxRate.rate / 100));
    
    totalTax += taxAmount;
    
    taxBreakdown.push({
      name: taxRate.name,
      code: taxRate.code,
      type: taxRate.type,
      rate: taxRate.rate,
      amount: taxAmount
    });
  }
  
  // Calculate compound taxes (taxes on taxes)
  for (const taxRate of compoundTaxes) {
    const compoundTaxableAmount = taxableAmount + totalTax;
    const taxAmount = this.roundTax(compoundTaxableAmount * (taxRate.rate / 100));
    
    totalTax += taxAmount;
    
    taxBreakdown.push({
      name: taxRate.name,
      code: taxRate.code,
      type: taxRate.type,
      rate: taxRate.rate,
      amount: taxAmount
    });
  }
  
  // Calculate total amount based on calculation method
  let totalAmount: number;
  
  if (this.defaultCalculationMethod === TaxCalculationMethod.INCLUSIVE) {
    // Tax is already included in the amount
    totalAmount = amount;
    taxableAmount = amount - totalTax;
  } else {
    // Tax is added to the amount
    totalAmount = amount + totalTax;
  }
  
  return {
    totalTax,
    taxBreakdown,
    taxableAmount,
    totalAmount
  };
};

/**
 * Round tax amount according to settings
 */
taxSettingsSchema.methods.roundTax = function(
  this: ITaxSettings,
  amount: number
): number {
  const multiplier = Math.pow(10, this.roundingPrecision);
  
  switch (this.roundingMethod) {
    case 'UP':
      return Math.ceil(amount * multiplier) / multiplier;
    case 'DOWN':
      return Math.floor(amount * multiplier) / multiplier;
    case 'NEAREST':
    default:
      return Math.round(amount * multiplier) / multiplier;
  }
};

/**
 * Get default tax settings
 */
taxSettingsSchema.statics.getDefaultSettings = async function(this: ITaxSettingsModel): Promise<ITaxSettings> {
  const settings = await this.findOne({ isGlobalDefault: true, isActive: true });
  
  if (!settings) {
    throw new Error('No default tax settings found');
  }
  
  return settings;
};

/**
 * Get tax settings for a company
 */
taxSettingsSchema.statics.getSettingsForCompany = async function(
  this: ITaxSettingsModel,
  companyId: Types.ObjectId | string
): Promise<ITaxSettings> {
  // Try to find company-specific settings
  const companySettings = await this.findOne({ 
    companyId, 
    isActive: true 
  });
  
  if (companySettings) {
    return companySettings;
  }
  
  // Fall back to default settings
  return this.getDefaultSettings();
};

/**
 * Find active tax rates
 */
taxSettingsSchema.statics.findActiveTaxRates = async function(
  this: ITaxSettingsModel,
  options: {
    taxType?: TaxType;
    jurisdictions?: Array<{
      level: TaxJurisdictionLevel;
      code: string;
    }>;
    productCategory?: string;
    customerCategory?: string;
    date?: Date;
  } = {}
): Promise<ITaxRate[]> {
  const date = options.date || new Date();
  
  // Get all active tax settings
  const allSettings = await this.find({ isActive: true });
  
  // Extract and filter tax rates from all settings
  const allTaxRates: ITaxRate[] = [];
  
  for (const settings of allSettings) {
    const filteredRates = settings.taxRates.filter(tr => {
      // Check if tax rate is active
      if (!tr.isActive) {
        return false;
      }
      
      // Check if tax rate is of the requested type
      if (options.taxType && tr.type !== options.taxType) {
        return false;
      }
      
      // Check if tax rate is effective for the specified date
      if (tr.effectiveFrom > date) {
        return false;
      }
      
      if (tr.effectiveTo && tr.effectiveTo < date) {
        return false;
      }
      
      // Check product category if specified
      if (options.productCategory && 
          tr.productCategories && 
          tr.productCategories.length > 0 && 
          !tr.productCategories.includes(options.productCategory)) {
        return false;
      }
      
      // Check customer category if specified
      if (options.customerCategory && 
          tr.customerCategories && 
          tr.customerCategories.length > 0 && 
          !tr.customerCategories.includes(options.customerCategory)) {
        return false;
      }
      
      // Check jurisdictions if specified
      if (options.jurisdictions && 
          options.jurisdictions.length > 0 && 
          tr.jurisdictions && 
          tr.jurisdictions.length > 0) {
        
        // Check if any of the requested jurisdictions match
        const hasMatchingJurisdiction = options.jurisdictions.some(reqJuris => {
          return tr.jurisdictions!.some(trJuris => 
            trJuris.level === reqJuris.level && trJuris.code === reqJuris.code
          );
        });
        
        if (!hasMatchingJurisdiction) {
          return false;
        }
      }
      
      return true;
    });
    
    allTaxRates.push(...filteredRates);
  }
  
  // Remove duplicates based on code
  const uniqueTaxRates: ITaxRate[] = [];
  const seenCodes = new Set<string>();
  
  for (const rate of allTaxRates) {
    if (!seenCodes.has(rate.code)) {
      seenCodes.add(rate.code);
      uniqueTaxRates.push(rate);
    }
  }
  
  // Sort by priority (higher priority first)
  uniqueTaxRates.sort((a, b) => b.priority - a.priority);
  
  return uniqueTaxRates;
};

// Export the model
export const TaxSettings = model<ITaxSettings, ITaxSettingsModel>('TaxSettings', taxSettingsSchema); 