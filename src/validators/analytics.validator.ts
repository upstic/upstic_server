import Joi from 'joi';

export const analyticsSchema = {
  generateReport: Joi.object({
    type: Joi.string().valid(
      'placement_metrics',
      'worker_performance',
      'client_satisfaction',
      'financial_summary',
      'compliance_status',
      'recruitment_funnel',
      'time_to_hire',
      'retention_rate'
    ).required(),
    dateRange: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required()
    }),
    filters: Joi.object({
      branchIds: Joi.array().items(Joi.string()),
      clientIds: Joi.array().items(Joi.string()),
      jobTypes: Joi.array().items(Joi.string()),
      skills: Joi.array().items(Joi.string()),
      locations: Joi.array().items(Joi.string())
    }),
    format: Joi.string().valid('pdf', 'excel', 'csv').default('pdf'),
    scheduling: Joi.object({
      frequency: Joi.string().valid('once', 'daily', 'weekly', 'monthly'),
      recipients: Joi.array().items(Joi.string().email())
    })
  }),

  dashboard: Joi.object({
    timeframe: Joi.string().valid('today', 'this_week', 'this_month', 'custom').required(),
    customRange: Joi.when('timeframe', {
      is: 'custom',
      then: Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).required()
      }).required()
    }),
    metrics: Joi.array().items(
      Joi.string().valid(
        'active_jobs',
        'pending_applications',
        'placements_made',
        'revenue',
        'worker_satisfaction',
        'client_satisfaction',
        'compliance_rate'
      )
    ).required()
  })
}; 