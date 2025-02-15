import Joi from 'joi';

export const scheduleSchema = {
  create: Joi.object({
    workerId: Joi.string().required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().greater(Joi.ref('startTime')).required(),
    type: Joi.string().valid('shift', 'appointment', 'break').required(),
    notes: Joi.string().optional(),
    location: Joi.string().optional(),
    status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled').default('scheduled')
  }),

  update: Joi.object({
    startTime: Joi.date(),
    endTime: Joi.date().greater(Joi.ref('startTime')),
    type: Joi.string().valid('shift', 'appointment', 'break'),
    notes: Joi.string(),
    location: Joi.string(),
    status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled')
  })
}; 