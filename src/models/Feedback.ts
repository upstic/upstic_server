import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for feedback type
 */
export enum FeedbackType {
  JOB = 'JOB',
  WORKER = 'WORKER',
  CLIENT = 'CLIENT',
  RECRUITER = 'RECRUITER',
  AGENCY = 'AGENCY',
  PLATFORM = 'PLATFORM',
  FEATURE = 'FEATURE',
  OTHER = 'OTHER'
}

/**
 * Enum for feedback status
 */
export enum FeedbackStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESPONDED = 'RESPONDED',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
  FLAGGED = 'FLAGGED'
}

/**
 * Enum for feedback sentiment
 */
export enum FeedbackSentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  MIXED = 'MIXED'
}

/**
 * Enum for feedback category
 */
export enum FeedbackCategory {
  PERFORMANCE = 'PERFORMANCE',
  COMMUNICATION = 'COMMUNICATION',
  PROFESSIONALISM = 'PROFESSIONALISM',
  QUALITY = 'QUALITY',
  TIMELINESS = 'TIMELINESS',
  RELIABILITY = 'RELIABILITY',
  TECHNICAL_SKILLS = 'TECHNICAL_SKILLS',
  SOFT_SKILLS = 'SOFT_SKILLS',
  PLATFORM_USABILITY = 'PLATFORM_USABILITY',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  BILLING = 'BILLING',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  BUG_REPORT = 'BUG_REPORT',
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER'
}

/**
 * Enum for feedback priority
 */
export enum FeedbackPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Interface for rating criteria
 */
export interface IRatingCriteria {
  name: string;
  score: number; // 1-5
  weight?: number; // 0-1, default is 1
  comment?: string;
}

/**
 * Interface for feedback response
 */
export interface IFeedbackResponse {
  responderId: Types.ObjectId | string;
  responderType: 'ADMIN' | 'STAFF' | 'SYSTEM' | 'USER';
  responderName: string;
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Interface for feedback
 */
export interface IFeedback extends Document {
  // Core data
  type: FeedbackType;
  status: FeedbackStatus;
  title: string;
  description: string;
  
  // Relationships
  submitterId: Types.ObjectId | string;
  submitterName: string;
  submitterEmail?: string;
  submitterType: 'WORKER' | 'CLIENT' | 'RECRUITER' | 'ADMIN' | 'GUEST';
  
  // Target entity
  targetType?: FeedbackType;
  targetId?: Types.ObjectId | string;
  targetName?: string;
  
  // Related entities
  relatedEntities?: Array<{
    type: string;
    id: Types.ObjectId | string;
    name?: string;
  }>;
  
  // Rating data
  overallRating?: number; // 1-5
  ratingCriteria?: IRatingCriteria[];
  
  // Categorization
  categories: FeedbackCategory[];
  tags?: string[];
  sentiment?: FeedbackSentiment;
  priority: FeedbackPriority;
  
  // Response tracking
  responses?: IFeedbackResponse[];
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId | string;
  resolutionNotes?: string;
  
  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: Date;
  followUpAssignedTo?: Types.ObjectId | string;
  followUpNotes?: string;
  followUpCompleted: boolean;
  followUpCompletedAt?: Date;
  
  // Visibility and privacy
  isAnonymous: boolean;
  isPublic: boolean;
  visibleToSubmitter: boolean;
  
  // Metadata
  source: 'WEB' | 'MOBILE' | 'EMAIL' | 'API' | 'ADMIN' | 'SYSTEM';
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Attachments
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }>;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId | string;
  
  // Methods
  addResponse(response: Partial<IFeedbackResponse>): Promise<IFeedback>;
  markAsReviewed(reviewerId: Types.ObjectId | string): Promise<IFeedback>;
  markAsResolved(resolverId: Types.ObjectId | string, notes?: string): Promise<IFeedback>;
  updateStatus(status: FeedbackStatus): Promise<IFeedback>;
  setPriority(priority: FeedbackPriority): Promise<IFeedback>;
  scheduleFollowUp(date: Date, assignedTo?: Types.ObjectId | string, notes?: string): Promise<IFeedback>;
  completeFollowUp(): Promise<IFeedback>;
  calculateAverageRating(): number;
}

/**
 * Schema for feedback
 */
const feedbackSchema = new Schema<IFeedback>(
  {
    // Core data
    type: {
      type: String,
      enum: Object.values(FeedbackType),
      required: [true, 'Feedback type is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(FeedbackStatus),
      default: FeedbackStatus.PENDING,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Feedback title is required'],
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: [true, 'Feedback description is required'],
      trim: true
    },
    
    // Relationships
    submitterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitter ID is required'],
      index: true
    },
    submitterName: {
      type: String,
      required: [true, 'Submitter name is required'],
      trim: true
    },
    submitterEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    submitterType: {
      type: String,
      enum: ['WORKER', 'CLIENT', 'RECRUITER', 'ADMIN', 'GUEST'],
      required: [true, 'Submitter type is required'],
      index: true
    },
    
    // Target entity
    targetType: {
      type: String,
      enum: Object.values(FeedbackType),
      index: true
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    targetName: {
      type: String,
      trim: true
    },
    
    // Related entities
    relatedEntities: [{
      type: {
        type: String,
        required: true,
        trim: true
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true
      },
      name: {
        type: String,
        trim: true
      }
    }],
    
    // Rating data
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    },
    ratingCriteria: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      weight: {
        type: Number,
        min: 0,
        max: 1,
        default: 1
      },
      comment: {
        type: String,
        trim: true
      }
    }],
    
    // Categorization
    categories: [{
      type: String,
      enum: Object.values(FeedbackCategory),
      required: true,
      index: true
    }],
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    sentiment: {
      type: String,
      enum: Object.values(FeedbackSentiment),
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(FeedbackPriority),
      default: FeedbackPriority.MEDIUM,
      index: true
    },
    
    // Response tracking
    responses: [{
      responderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      responderType: {
        type: String,
        enum: ['ADMIN', 'STAFF', 'SYSTEM', 'USER'],
        required: true
      },
      responderName: {
        type: String,
        required: true,
        trim: true
      },
      content: {
        type: String,
        required: true,
        trim: true
      },
      attachments: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        url: {
          type: String,
          required: true,
          trim: true
        },
        type: {
          type: String,
          required: true,
          trim: true
        },
        size: {
          type: Number,
          required: true,
          min: 0
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }],
      isPublic: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date
      }
    }],
    isResolved: {
      type: Boolean,
      default: false,
      index: true
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: {
      type: String,
      trim: true
    },
    
    // Follow-up
    requiresFollowUp: {
      type: Boolean,
      default: false,
      index: true
    },
    followUpDate: {
      type: Date,
      index: true
    },
    followUpAssignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    followUpNotes: {
      type: String,
      trim: true
    },
    followUpCompleted: {
      type: Boolean,
      default: false,
      index: true
    },
    followUpCompletedAt: {
      type: Date
    },
    
    // Visibility and privacy
    isAnonymous: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    visibleToSubmitter: {
      type: Boolean,
      default: true
    },
    
    // Metadata
    source: {
      type: String,
      enum: ['WEB', 'MOBILE', 'EMAIL', 'API', 'ADMIN', 'SYSTEM'],
      default: 'WEB',
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    location: {
      country: {
        type: String,
        trim: true
      },
      region: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90
        },
        longitude: {
          type: Number,
          min: -180,
          max: 180
        }
      }
    },
    
    // Attachments
    attachments: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        required: true,
        trim: true
      },
      size: {
        type: Number,
        required: true,
        min: 0
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Audit fields
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ submitterId: 1, createdAt: -1 });
feedbackSchema.index({ targetId: 1, targetType: 1 });

// Compound indexes for optimized queries
feedbackSchema.index({ status: 1, priority: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1, createdAt: -1 });
feedbackSchema.index({ requiresFollowUp: 1, followUpCompleted: 1, followUpDate: 1 });

// Calculate overall rating if not provided but rating criteria are
feedbackSchema.pre('save', function(next) {
  if (this.ratingCriteria && this.ratingCriteria.length > 0 && !this.overallRating) {
    this.overallRating = this.calculateAverageRating();
  }
  
  next();
});

// Update status when resolved
feedbackSchema.pre('save', function(next) {
  if (this.isResolved && this.status !== FeedbackStatus.RESOLVED) {
    this.status = FeedbackStatus.RESOLVED;
  }
  
  next();
});

/**
 * Add response to feedback
 */
feedbackSchema.methods.addResponse = async function(
  response: Partial<IFeedbackResponse>
): Promise<IFeedback> {
  if (!response.responderId || !response.responderType || !response.responderName || !response.content) {
    throw new Error('Responder ID, type, name, and content are required');
  }
  
  if (!this.responses) {
    this.responses = [];
  }
  
  const newResponse: IFeedbackResponse = {
    responderId: response.responderId,
    responderType: response.responderType,
    responderName: response.responderName,
    content: response.content,
    attachments: response.attachments || [],
    isPublic: response.isPublic !== undefined ? response.isPublic : true,
    createdAt: new Date(),
    updatedAt: undefined
  };
  
  this.responses.push(newResponse);
  
  // Update status if not already resolved
  if (this.status !== FeedbackStatus.RESOLVED) {
    this.status = FeedbackStatus.RESPONDED;
  }
  
  return this.save();
};

/**
 * Mark feedback as reviewed
 */
feedbackSchema.methods.markAsReviewed = async function(
  reviewerId: Types.ObjectId | string
): Promise<IFeedback> {
  this.status = FeedbackStatus.REVIEWED;
  this.reviewedAt = new Date();
  this.reviewedBy = reviewerId;
  
  return this.save();
};

/**
 * Mark feedback as resolved
 */
feedbackSchema.methods.markAsResolved = async function(
  resolverId: Types.ObjectId | string,
  notes?: string
): Promise<IFeedback> {
  this.status = FeedbackStatus.RESOLVED;
  this.isResolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolverId;
  
  if (notes) {
    this.resolutionNotes = notes;
  }
  
  return this.save();
};

/**
 * Update feedback status
 */
feedbackSchema.methods.updateStatus = async function(
  status: FeedbackStatus
): Promise<IFeedback> {
  this.status = status;
  
  // Update isResolved flag if status is RESOLVED
  if (status === FeedbackStatus.RESOLVED) {
    this.isResolved = true;
    this.resolvedAt = new Date();
  } else if (this.isResolved) {
    this.isResolved = false;
    this.resolvedAt = undefined;
  }
  
  return this.save();
};

/**
 * Set feedback priority
 */
feedbackSchema.methods.setPriority = async function(
  priority: FeedbackPriority
): Promise<IFeedback> {
  this.priority = priority;
  return this.save();
};

/**
 * Schedule follow-up
 */
feedbackSchema.methods.scheduleFollowUp = async function(
  date: Date,
  assignedTo?: Types.ObjectId | string,
  notes?: string
): Promise<IFeedback> {
  this.requiresFollowUp = true;
  this.followUpDate = date;
  this.followUpCompleted = false;
  
  if (assignedTo) {
    this.followUpAssignedTo = assignedTo;
  }
  
  if (notes) {
    this.followUpNotes = notes;
  }
  
  return this.save();
};

/**
 * Complete follow-up
 */
feedbackSchema.methods.completeFollowUp = async function(): Promise<IFeedback> {
  if (!this.requiresFollowUp) {
    throw new Error('No follow-up scheduled');
  }
  
  this.followUpCompleted = true;
  this.followUpCompletedAt = new Date();
  
  return this.save();
};

/**
 * Calculate average rating from rating criteria
 */
feedbackSchema.methods.calculateAverageRating = function(): number {
  if (!this.ratingCriteria || this.ratingCriteria.length === 0) {
    return 0;
  }
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const criteria of this.ratingCriteria) {
    const weight = criteria.weight || 1;
    totalWeightedScore += criteria.score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 10) / 10 : 0;
};

/**
 * Find feedback by submitter
 */
feedbackSchema.statics.findBySubmitter = async function(
  submitterId: Types.ObjectId | string
): Promise<IFeedback[]> {
  return this.find({ submitterId }).sort({ createdAt: -1 });
};

/**
 * Find feedback by target
 */
feedbackSchema.statics.findByTarget = async function(
  targetType: FeedbackType,
  targetId: Types.ObjectId | string
): Promise<IFeedback[]> {
  return this.find({
    targetType,
    targetId
  }).sort({ createdAt: -1 });
};

/**
 * Find feedback requiring follow-up
 */
feedbackSchema.statics.findRequiringFollowUp = async function(
  assignedTo?: Types.ObjectId | string
): Promise<IFeedback[]> {
  const query: any = {
    requiresFollowUp: true,
    followUpCompleted: false,
    followUpDate: { $lte: new Date() }
  };
  
  if (assignedTo) {
    query.followUpAssignedTo = assignedTo;
  }
  
  return this.find(query).sort({ followUpDate: 1 });
};

/**
 * Find feedback by status and priority
 */
feedbackSchema.statics.findByStatusAndPriority = async function(
  status: FeedbackStatus,
  priority?: FeedbackPriority
): Promise<IFeedback[]> {
  const query: any = { status };
  
  if (priority) {
    query.priority = priority;
  }
  
  return this.find(query).sort({ 
    priority: -1, // High priority first
    createdAt: -1 // Newest first
  });
};

/**
 * Find feedback by category
 */
feedbackSchema.statics.findByCategory = async function(
  category: FeedbackCategory
): Promise<IFeedback[]> {
  return this.find({
    categories: category
  }).sort({ createdAt: -1 });
};

/**
 * Get average rating by target
 */
feedbackSchema.statics.getAverageRatingByTarget = async function(
  targetType: FeedbackType,
  targetId: Types.ObjectId | string
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        targetType,
        targetId,
        overallRating: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$overallRating' }
      }
    }
  ]);
  
  return result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
};

/**
 * Get rating distribution by target
 */
feedbackSchema.statics.getRatingDistributionByTarget = async function(
  targetType: FeedbackType,
  targetId: Types.ObjectId | string
): Promise<Record<number, number>> {
  const result = await this.aggregate([
    {
      $match: {
        targetType,
        targetId,
        overallRating: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$overallRating',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  
  result.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  return distribution;
};

/**
 * Get sentiment distribution
 */
feedbackSchema.statics.getSentimentDistribution = async function(
  targetType?: FeedbackType,
  targetId?: Types.ObjectId | string
): Promise<Record<FeedbackSentiment, number>> {
  const match: any = {
    sentiment: { $exists: true, $ne: null }
  };
  
  if (targetType) {
    match.targetType = targetType;
  }
  
  if (targetId) {
    match.targetId = targetId;
  }
  
  const result = await this.aggregate([
    {
      $match: match
    },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const distribution: Record<FeedbackSentiment, number> = {
    [FeedbackSentiment.POSITIVE]: 0,
    [FeedbackSentiment.NEUTRAL]: 0,
    [FeedbackSentiment.NEGATIVE]: 0,
    [FeedbackSentiment.MIXED]: 0
  };
  
  result.forEach(item => {
    distribution[item._id as FeedbackSentiment] = item.count;
  });
  
  return distribution;
};

// Export the model
export const Feedback = model<IFeedback>('Feedback', feedbackSchema); 