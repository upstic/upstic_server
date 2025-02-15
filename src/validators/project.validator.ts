import Joi from 'joi';

export const projectSchema = {
  create: Joi.object({
    name: Joi.string().required(),
    clientId: Joi.string().required(),
    description: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
    budget: Joi.object({
      amount: Joi.number().min(0).required(),
      currency: Joi.string().required(),
      type: Joi.string().valid('fixed', 'hourly').required()
    }),
    team: Joi.array().items(
      Joi.object({
        userId: Joi.string().required(),
        role: Joi.string().required(),
        hourlyRate: Joi.number().min(0).when('budget.type', {
          is: 'hourly',
          then: Joi.required()
        })
      })
    ),
    milestones: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string(),
        dueDate: Joi.date().required(),
        amount: Joi.number().min(0)
      })
    )
  }),

  update: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    endDate: Joi.date(),
    status: Joi.string().valid('planning', 'active', 'on-hold', 'completed', 'cancelled'),
    budget: Joi.object({
      amount: Joi.number().min(0),
      currency: Joi.string(),
      type: Joi.string().valid('fixed', 'hourly')
    }),
    team: Joi.array().items(
      Joi.object({
        userId: Joi.string(),
        role: Joi.string(),
        hourlyRate: Joi.number().min(0)
      })
    ),
    milestones: Joi.array().items(
      Joi.object({
        title: Joi.string(),
        description: Joi.string(),
        dueDate: Joi.date(),
        amount: Joi.number().min(0),
        status: Joi.string().valid('pending', 'completed', 'delayed')
      })
    )
  })
}; 