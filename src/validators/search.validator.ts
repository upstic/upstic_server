import Joi from 'joi';

export const searchSchema = {
  workers: Joi.object({
    query: Joi.string(),
    filters: Joi.object({
      skills: Joi.array().items(Joi.string()),
      experience: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }),
      availability: Joi.array().items(
        Joi.string().valid('morning', 'afternoon', 'night')
      ),
      location: Joi.object({
        city: Joi.string(),
        state: Joi.string(),
        country: Joi.string(),
        radius: Joi.number().min(0)
      }),
      rating: Joi.number().min(1).max(5),
      status: Joi.string().valid('available', 'working', 'unavailable')
    }),
    sort: Joi.object({
      field: Joi.string().valid('rating', 'experience', 'availability', 'lastActive'),
      order: Joi.string().valid('asc', 'desc')
    }),
    pagination: Joi.object({
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(10)
    })
  }),

  jobs: Joi.object({
    query: Joi.string(),
    filters: Joi.object({
      type: Joi.array().items(
        Joi.string().valid('full-time', 'part-time', 'temporary', 'contract')
      ),
      location: Joi.object({
        city: Joi.string(),
        state: Joi.string(),
        country: Joi.string(),
        radius: Joi.number().min(0)
      }),
      salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }),
      skills: Joi.array().items(Joi.string()),
      status: Joi.string().valid('open', 'filled', 'cancelled')
    }),
    sort: Joi.object({
      field: Joi.string().valid('postedDate', 'salary', 'relevance'),
      order: Joi.string().valid('asc', 'desc')
    }),
    pagination: Joi.object({
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(10)
    })
  })
}; 