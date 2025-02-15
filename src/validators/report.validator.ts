import Joi from 'joi';

export const reportSchema = {
  generate: Joi.object({
    type: Joi.string().valid('timesheet', 'payroll', 'invoice', 'performance').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    format: Joi.string().valid('pdf', 'csv', 'excel').default('pdf'),
    filters: Joi.object({
      workerId: Joi.string(),
      clientId: Joi.string(),
      projectId: Joi.string(),
      status: Joi.string()
    }).optional()
  }),

  schedule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    type: Joi.string().valid('financial', 'activity', 'performance').required(),
    format: Joi.string().valid('pdf', 'csv', 'excel').default('pdf'),
    recipients: Joi.array().items(Joi.string().email()).min(1).required()
  }),

  updateSchedule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly'),
    type: Joi.string().valid('financial', 'activity', 'performance'),
    format: Joi.string().valid('pdf', 'csv', 'excel'),
    recipients: Joi.array().items(Joi.string().email()).min(1)
  }),

  createTemplate: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('financial', 'activity', 'performance').required(),
    config: Joi.object().required()
  }),

  updateTemplate: Joi.object({
    name: Joi.string(),
    type: Joi.string().valid('financial', 'activity', 'performance'),
    config: Joi.object()
  })
}; 