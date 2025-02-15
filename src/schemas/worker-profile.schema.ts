import { Schema } from 'mongoose';

export const WorkerProfileSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    photoUrl: String,
    thumbnailUrl: String,
    summary: String,
    skills: [String],
    salary: {
      expected: Number,
      currency: String
    },
    location: {
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      address: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    dateOfBirth: Date,
    nationality: String,
    languages: [{
      name: String,
      level: String
    }]
  },
  workExperience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date,
    verified: Boolean
  }],
  metrics: {
    profileCompleteness: Number,
    totalPlacements: Number,
    averageRating: Number,
    reliabilityScore: Number,
    lastActive: Date
  }
}, {
  timestamps: true
}); 