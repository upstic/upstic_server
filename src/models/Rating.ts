import mongoose, { Document, Schema, Types } from 'mongoose';

export enum RatingCategory {
  PERFORMANCE = 'performance',
  RELIABILITY = 'reliability',
  QUALITY = 'quality',
  COMMUNICATION = 'communication',
  PROFESSIONALISM = 'professionalism',
  TECHNICAL_SKILLS = 'technical_skills',
  TEAMWORK = 'teamwork',
  PUNCTUALITY = 'punctuality',
  OVERALL = 'overall'
}

export enum RatingSource {
  CLIENT = 'client',
  WORKER = 'worker',
  RECRUITER = 'recruiter',
  MANAGER = 'manager',
  SYSTEM = 'system'
}

export enum RatingVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ADMIN_ONLY = 'admin_only'
}

export enum RatingStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  DISPUTED = 'disputed',
  RESOLVED = 'resolved',
  DELETED = 'deleted'
}

export interface IRatingResponse {
  content: string;
  respondedBy: Types.ObjectId | string;
  respondedAt: Date;
  isPublic: boolean;
}

export interface IRatingScore {
  category: RatingCategory;
  score: number; // 1-5 scale
  weight?: number; // For weighted average calculations
  comment?: string; // Category-specific comment
}

export interface IRating extends Document {
  // Core rating data
  scores: IRatingScore[];
  averageScore: number;
  comment: string;
  
  // Relationships
  jobId?: Types.ObjectId | string;
  workerId?: Types.ObjectId | string;
  clientId?: Types.ObjectId | string;
  shiftId?: Types.ObjectId | string;
  timesheetId?: Types.ObjectId | string;
  
  // Rating metadata
  source: RatingSource;
  ratedBy: Types.ObjectId | string;
  ratedAt: Date;
  visibility: RatingVisibility;
  status: RatingStatus;
  
  // Response tracking
  response?: IRatingResponse;
  
  // Additional fields
  tags?: string[];
  improvementSuggestions?: string;
  strengths?: string[];
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Helper methods
  calculateAverageScore(): number;
  isDisputable(): boolean;
  hasResponse(): boolean;
}

const ratingScoreSchema = new Schema<IRatingScore>({
  category: {
    type: String,
    enum: Object.values(RatingCategory),
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  weight: {
    type: Number,
    default: 1
  },
  comment: String
});

const ratingResponseSchema = new Schema<IRatingResponse>({
  content: {
    type: String,
    required: true
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  respondedAt: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: true
  }
});

const ratingSchema = new Schema<IRating>({
  // Core rating data
  scores: {
    type: [ratingScoreSchema],
    required: true,
    validate: {
      validator: function(scores: IRatingScore[]) {
        return scores.length > 0;
      },
      message: 'At least one score is required'
    }
  },
  averageScore: {
    type: Number,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Relationships
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    index: true
  },
  workerId: {
    type: Schema.Types.ObjectId,
    ref: 'Worker',
    index: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  shiftId: {
    type: Schema.Types.ObjectId,
    ref: 'Shift',
    index: true
  },
  timesheetId: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    index: true
  },
  
  // Rating metadata
  source: {
    type: String,
    enum: Object.values(RatingSource),
    required: true
  },
  ratedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedAt: {
    type: Date,
    default: Date.now
  },
  visibility: {
    type: String,
    enum: Object.values(RatingVisibility),
    default: RatingVisibility.PUBLIC
  },
  status: {
    type: String,
    enum: Object.values(RatingStatus),
    default: RatingStatus.PENDING
  },
  
  // Response tracking
  response: ratingResponseSchema,
  
  // Additional fields
  tags: [String],
  improvementSuggestions: String,
  strengths: [String],
  
  // Audit fields
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

// Indexes for efficient querying
ratingSchema.index({ workerId: 1, createdAt: -1 });
ratingSchema.index({ clientId: 1, createdAt: -1 });
ratingSchema.index({ jobId: 1, createdAt: -1 });
ratingSchema.index({ source: 1, status: 1 });
ratingSchema.index({ averageScore: -1 });

// Virtual for age of rating
ratingSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.ratedAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate average score
ratingSchema.pre('save', function(next) {
  if (this.isModified('scores')) {
    this.averageScore = this.calculateAverageScore();
  }
  next();
});

// Method to calculate average score
ratingSchema.methods.calculateAverageScore = function(): number {
  if (!this.scores || this.scores.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  this.scores.forEach(score => {
    const weight = score.weight || 1;
    totalWeight += weight;
    weightedSum += score.score * weight;
  });
  
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
};

// Method to check if rating is disputable
ratingSchema.methods.isDisputable = function(): boolean {
  // Ratings can be disputed within 14 days of creation
  const ageInDays = Math.floor((Date.now() - this.ratedAt.getTime()) / (1000 * 60 * 60 * 24));
  return ageInDays <= 14 && this.status !== RatingStatus.DISPUTED && this.status !== RatingStatus.RESOLVED;
};

// Method to check if rating has a response
ratingSchema.methods.hasResponse = function(): boolean {
  return !!this.response;
};

// Static method to get average rating for an entity
ratingSchema.statics.getAverageRating = async function(
  entityType: 'worker' | 'client' | 'job',
  entityId: Types.ObjectId | string
): Promise<number> {
  const field = `${entityType}Id`;
  const match: any = {};
  match[field] = entityId;
  match.status = RatingStatus.PUBLISHED;
  
  const result = await this.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      averageRating: { $avg: '$averageScore' }
    }}
  ]);
  
  return result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
};

export const Rating = mongoose.model<IRating>('Rating', ratingSchema); 