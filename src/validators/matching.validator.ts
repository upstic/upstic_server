import Joi from 'joi';

export const matchingSchema = {
  createCriteria: Joi.object({
    jobId: Joi.string().required(),
    requiredSkills: Joi.array().items(
      Joi.object({
        skill: Joi.string().required(),
        level: Joi.string().valid('beginner', 'intermediate', 'expert').required(),
        weight: Joi.number().min(0).max(1)
      })
    ).required(),
    experience: Joi.object({
      minYears: Joi.number().min(0),
      preferredYears: Joi.number().min(0),
      weight: Joi.number().min(0).max(1)
    }),
    location: Joi.object({
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
      }),
      maxDistance: Joi.number().min(0),
      weight: Joi.number().min(0).max(1)
    }),
    availability: Joi.object({
      requiredDays: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ),
      shifts: Joi.array().items(
        Joi.string().valid('morning', 'afternoon', 'night')
      ),
      weight: Joi.number().min(0).max(1)
    }),
    certifications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        isRequired: Joi.boolean().default(true),
        weight: Joi.number().min(0).max(1)
      })
    ),
    previousPerformance: Joi.object({
      minRating: Joi.number().min(1).max(5),
      weight: Joi.number().min(0).max(1)
    })
  }),

  findMatches: Joi.object({
    jobId: Joi.string().required(),
    limit: Joi.number().min(1).max(100).default(10),
    minMatchScore: Joi.number().min(0).max(1).default(0.6),
    includeUnavailable: Joi.boolean().default(false)
  })
}; 