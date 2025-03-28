import mongoose, { Document, Schema } from 'mongoose';

export interface IClientCompanyLocation extends Document {
  client: Schema.Types.ObjectId;
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
  notes?: string;
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clientCompanyLocationSchema = new Schema<IClientCompanyLocation>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      default: false
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
clientCompanyLocationSchema.index({ client: 1, isHeadquarters: 1 });
clientCompanyLocationSchema.index({ client: 1, isActive: 1 });
clientCompanyLocationSchema.index({ 'address.city': 1, 'address.country': 1 });

// Static methods
clientCompanyLocationSchema.statics.findByClient = function(clientId: Schema.Types.ObjectId | string) {
  return this.find({ client: clientId, isActive: true });
};

clientCompanyLocationSchema.statics.findHeadquarters = function(clientId: Schema.Types.ObjectId | string) {
  return this.findOne({ client: clientId, isHeadquarters: true, isActive: true });
};

clientCompanyLocationSchema.statics.findNearby = function(
  coordinates: [number, number],
  maxDistance: number = 50000, // 50km in meters
  clientId?: Schema.Types.ObjectId | string
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
  
  if (clientId) {
    query.client = clientId;
  }
  
  return this.find(query);
};

export const ClientCompanyLocation = mongoose.model<IClientCompanyLocation>(
  'ClientCompanyLocation',
  clientCompanyLocationSchema
); 