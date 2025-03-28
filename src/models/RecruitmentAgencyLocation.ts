import mongoose, { Document, Schema } from 'mongoose';

export interface IRecruitmentAgencyLocation extends Document {
  agency: Schema.Types.ObjectId;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  contactPerson: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  isHeadquarters: boolean;
  isActive: boolean;
  operatingHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  facilities: string[];
  specializations: string[];
  industries: string[];
  staffCount: number;
  notes?: string;
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recruitmentAgencyLocationSchema = new Schema<IRecruitmentAgencyLocation>(
  {
    agency: {
      type: Schema.Types.ObjectId,
      ref: 'RecruitmentAgency',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true,
        index: true
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
        required: true,
        index: true
      },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    },
    contactPerson: {
      name: {
        type: String,
        required: true
      },
      position: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      }
    },
    isHeadquarters: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    operatingHours: {
      monday: {
        open: String,
        close: String
      },
      tuesday: {
        open: String,
        close: String
      },
      wednesday: {
        open: String,
        close: String
      },
      thursday: {
        open: String,
        close: String
      },
      friday: {
        open: String,
        close: String
      },
      saturday: {
        open: String,
        close: String
      },
      sunday: {
        open: String,
        close: String
      }
    },
    facilities: [String],
    specializations: {
      type: [String],
      index: true
    },
    industries: {
      type: [String],
      index: true
    },
    staffCount: {
      type: Number,
      default: 0
    },
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

// Compound indexes for common query patterns
recruitmentAgencyLocationSchema.index({ agency: 1, isHeadquarters: 1 });
recruitmentAgencyLocationSchema.index({ agency: 1, isActive: 1 });
recruitmentAgencyLocationSchema.index({ 'address.city': 1, 'address.country': 1 });
recruitmentAgencyLocationSchema.index({ specializations: 1, industries: 1 });

// Static methods
recruitmentAgencyLocationSchema.statics.findByAgency = function(agencyId: Schema.Types.ObjectId | string) {
  return this.find({ agency: agencyId, isActive: true });
};

recruitmentAgencyLocationSchema.statics.findHeadquarters = function(agencyId: Schema.Types.ObjectId | string) {
  return this.findOne({ agency: agencyId, isHeadquarters: true, isActive: true });
};

recruitmentAgencyLocationSchema.statics.findBySpecialization = function(
  specialization: string,
  agencyId?: Schema.Types.ObjectId | string
) {
  const query: any = { specializations: specialization, isActive: true };
  
  if (agencyId) {
    query.agency = agencyId;
  }
  
  return this.find(query);
};

recruitmentAgencyLocationSchema.statics.findByIndustry = function(
  industry: string,
  agencyId?: Schema.Types.ObjectId | string
) {
  const query: any = { industries: industry, isActive: true };
  
  if (agencyId) {
    query.agency = agencyId;
  }
  
  return this.find(query);
};

recruitmentAgencyLocationSchema.statics.findNearby = function(
  coordinates: [number, number],
  maxDistance: number = 50000, // 50km in meters
  agencyId?: Schema.Types.ObjectId | string
) {
  const query: any = {
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  };
  
  if (agencyId) {
    query.agency = agencyId;
  }
  
  return this.find(query);
};

export const RecruitmentAgencyLocation = mongoose.model<IRecruitmentAgencyLocation>(
  'RecruitmentAgencyLocation',
  recruitmentAgencyLocationSchema
); 