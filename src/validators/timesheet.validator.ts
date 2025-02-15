import Joi from 'joi';

export const timesheetSchema = {
  create: Joi.object({
    workerId: Joi.string().required(),
    date: Joi.date().required(),
    hours: Joi.number().min(0).max(24).required(),
    projectId: Joi.string().required(),
    description: Joi.string().required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending')
  }),

  update: Joi.object({
    hours: Joi.number().min(0).max(24),
    description: Joi.string(),
    status: Joi.string().valid('pending', 'approved', 'rejected')
  }),

  approve: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    feedback: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.required()
    })
  })
}; 