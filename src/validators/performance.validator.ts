import Joi from 'joi';

export const performanceSchema = {
  create: Joi.object({
    workerId: Joi.string().required(),
    reviewerId: Joi.string().required(),
    period: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required()
    }),
    ratings: Joi.object({
      productivity: Joi.number().min(1).max(5).required(),
      quality: Joi.number().min(1).max(5).required(),
      reliability: Joi.number().min(1).max(5).required(),
      communication: Joi.number().min(1).max(5).required(),
      teamwork: Joi.number().min(1).max(5).required()
    }),
    feedback: Joi.object({
      strengths: Joi.array().items(Joi.string()).min(1).required(),
      improvements: Joi.array().items(Joi.string()).min(1).required(),
      comments: Joi.string().required()
    }),
    goals: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        deadline: Joi.date().required(),
        priority: Joi.string().valid('low', 'medium', 'high').required()
      })
    ).min(1)
  }),

  update: Joi.object({
    ratings: Joi.object({
      productivity: Joi.number().min(1).max(5),
      quality: Joi.number().min(1).max(5),
      reliability: Joi.number().min(1).max(5),
      communication: Joi.number().min(1).max(5),
      teamwork: Joi.number().min(1).max(5)
    }),
    feedback: Joi.object({
      strengths: Joi.array().items(Joi.string()),
      improvements: Joi.array().items(Joi.string()),
      comments: Joi.string()
    }),
    goals: Joi.array().items(
      Joi.object({
        description: Joi.string(),
        deadline: Joi.date(),
        priority: Joi.string().valid('low', 'medium', 'high'),
        status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled')
      })
    ),
    status: Joi.string().valid('draft', 'submitted', 'acknowledged', 'disputed')
  })
}; 