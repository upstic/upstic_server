import mongoose, { Schema } from 'mongoose';

export interface ISkillWeight {
  skill: string;
  weight: number;
  minimumLevel?: number;
}

export interface IMatchingCriteria {
  jobType: string;
  requiredSkills: ISkillWeight[];
  preferredSkills: ISkillWeight[];
  locationWeight: number;
  experienceWeight: number;
  ratingWeight: number;
  availabilityWeight: number;
  complianceWeight: number;
  minimumScore: number;
  bonusFactors: {
    previouslyWorked: number;
    preferredWorker: number;
    urgentFill: number;
  };
  customFactors?: Record<string, number>;
}

const matchingCriteriaSchema = new Schema<IMatchingCriteria>({
  jobType: {
    type: String,
    required: true,
    unique: true
  },
  requiredSkills: [{
    skill: String,
    weight: Number,
    minimumLevel: Number
  }],
  preferredSkills: [{
    skill: String,
    weight: Number,
    minimumLevel: Number
  }],
  locationWeight: {
    type: Number,
    default: 1.0
  },
  experienceWeight: {
    type: Number,
    default: 1.0
  },
  ratingWeight: {
    type: Number,
    default: 1.0
  },
  availabilityWeight: {
    type: Number,
    default: 1.0
  },
  complianceWeight: {
    type: Number,
    default: 1.0
  },
  minimumScore: {
    type: Number,
    default: 0.6
  },
  bonusFactors: {
    previouslyWorked: {
      type: Number,
      default: 0.1
    },
    preferredWorker: {
      type: Number,
      default: 0.1
    },
    urgentFill: {
      type: Number,
      default: 0.1
    }
  },
  customFactors: Schema.Types.Mixed
}, {
  timestamps: true
});

export const MatchingCriteria = mongoose.model<IMatchingCriteria>('MatchingCriteria', matchingCriteriaSchema); 