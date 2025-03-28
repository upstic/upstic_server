import mongoose, { Document, Schema } from 'mongoose';

export enum RecruiterSpecialization {
  TECHNICAL = 'technical',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EXECUTIVE = 'executive',
  INDUSTRIAL = 'industrial',
  HOSPITALITY = 'hospitality',
  RETAIL = 'retail',
  EDUCATION = 'education',
  GENERAL = 'general'
}

export enum RecruiterLevel {
  JUNIOR = 'junior',
  INTERMEDIATE = 'intermediate',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director'
}

export interface IRecruiterData extends Document {
  userId: Schema.Types.ObjectId;
  agency: Schema.Types.ObjectId;
  agencyLocation?: Schema.Types.ObjectId;
  title: string;
  level: RecruiterLevel;
  bio?: string;
  photo?: string;
  specializations: RecruiterSpecialization[];
  industries: string[];
  skills: string[];
  languages: Array<{
    name: string;
    proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  }>;
  experience: {
    yearsInRecruitment: number;
    yearsInCurrentRole: number;
    previousAgencies?: string[];
  };
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
  }>;
  metrics: {
    activeJobs: number;
    totalPlacements: number;
    placementsThisMonth: number;
    placementsThisYear: number;
    averageTimeToFill: number;
    clientSatisfaction: number;
    candidateSatisfaction: number;
    retentionRate: number;
  };
  preferences: {
    notificationSettings: {
      email: boolean;
      sms: boolean;
      inApp: boolean;
    };
    availabilityHours: {
      monday?: { start: string; end: string };
      tuesday?: { start: string; end: string };
      wednesday?: { start: string; end: string };
      thursday?: { start: string; end: string };
      friday?: { start: string; end: string };
      saturday?: { start: string; end: string };
      sunday?: { start: string; end: string };
    };
    outOfOffice: {
      isActive: boolean;
      startDate?: Date;
      endDate?: Date;
      message?: string;
      delegateTo?: Schema.Types.ObjectId;
    };
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recruiterDataSchema = new Schema<IRecruiterData>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    agency: {
      type: Schema.Types.ObjectId,
      ref: 'RecruitmentAgency',
      required: true,
      index: true
    },
    agencyLocation: {
      type: Schema.Types.ObjectId,
      ref: 'RecruitmentAgencyLocation',
      index: true
    },
    title: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: Object.values(RecruiterLevel),
      required: true,
      index: true
    },
    bio: String,
    photo: String,
    specializations: [{
      type: String,
      enum: Object.values(RecruiterSpecialization),
      index: true
    }],
    industries: {
      type: [String],
      index: true
    },
    skills: [String],
    languages: [{
      name: {
        type: String,
        required: true
      },
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native'],
        required: true
      }
    }],
    experience: {
      yearsInRecruitment: {
        type: Number,
        required: true,
        min: 0
      },
      yearsInCurrentRole: {
        type: Number,
        required: true,
        min: 0
      },
      previousAgencies: [String]
    },
    education: [{
      institution: {
        type: String,
        required: true
      },
      degree: {
        type: String,
        required: true
      },
      field: {
        type: String,
        required: true
      },
      year: {
        type: Number,
        required: true
      }
    }],
    certifications: [{
      name: {
        type: String,
        required: true
      },
      issuingOrganization: {
        type: String,
        required: true
      },
      issueDate: {
        type: Date,
        required: true
      },
      expiryDate: Date
    }],
    metrics: {
      activeJobs: {
        type: Number,
        default: 0
      },
      totalPlacements: {
        type: Number,
        default: 0
      },
      placementsThisMonth: {
        type: Number,
        default: 0
      },
      placementsThisYear: {
        type: Number,
        default: 0
      },
      averageTimeToFill: {
        type: Number,
        default: 0
      },
      clientSatisfaction: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      candidateSatisfaction: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      retentionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    preferences: {
      notificationSettings: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        },
        inApp: {
          type: Boolean,
          default: true
        }
      },
      availabilityHours: {
        monday: {
          start: String,
          end: String
        },
        tuesday: {
          start: String,
          end: String
        },
        wednesday: {
          start: String,
          end: String
        },
        thursday: {
          start: String,
          end: String
        },
        friday: {
          start: String,
          end: String
        },
        saturday: {
          start: String,
          end: String
        },
        sunday: {
          start: String,
          end: String
        }
      },
      outOfOffice: {
        isActive: {
          type: Boolean,
          default: false
        },
        startDate: Date,
        endDate: Date,
        message: String,
        delegateTo: {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    socialMedia: {
      linkedin: String,
      twitter: String,
      facebook: String
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common query patterns
recruiterDataSchema.index({ agency: 1, isActive: 1 });
recruiterDataSchema.index({ specializations: 1, industries: 1 });
recruiterDataSchema.index({ level: 1, 'metrics.totalPlacements': -1 });

// Static methods
recruiterDataSchema.statics.findByAgency = function(agencyId: Schema.Types.ObjectId | string) {
  return this.find({ agency: agencyId, isActive: true });
};

recruiterDataSchema.statics.findBySpecialization = function(specialization: RecruiterSpecialization) {
  return this.find({ specializations: specialization, isActive: true });
};

recruiterDataSchema.statics.findByIndustry = function(industry: string) {
  return this.find({ industries: industry, isActive: true });
};

recruiterDataSchema.statics.findTopPerformers = function(
  agencyId?: Schema.Types.ObjectId | string,
  limit = 10
) {
  const query: any = { isActive: true };
  
  if (agencyId) {
    query.agency = agencyId;
  }
  
  return this.find(query)
    .sort({ 'metrics.totalPlacements': -1 })
    .limit(limit);
};

recruiterDataSchema.statics.updateMetrics = async function(
  userId: Schema.Types.ObjectId | string,
  metrics: Partial<IRecruiterData['metrics']>
) {
  return this.findOneAndUpdate(
    { userId },
    { $set: { metrics } },
    { new: true }
  );
};

recruiterDataSchema.statics.setOutOfOffice = async function(
  userId: Schema.Types.ObjectId | string,
  outOfOffice: IRecruiterData['preferences']['outOfOffice']
) {
  return this.findOneAndUpdate(
    { userId },
    { $set: { 'preferences.outOfOffice': outOfOffice } },
    { new: true }
  );
};

export const RecruiterData = mongoose.model<IRecruiterData>('RecruiterData', recruiterDataSchema); 