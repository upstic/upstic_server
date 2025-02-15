import Joi from 'joi';

export const metricsSchema = {
  track: Joi.object({
    metricType: Joi.string().valid(
      'job_view',
      'application_submit',
      'search_performed',
      'profile_view',
      'message_sent',
      'time_to_hire',
      'conversion_rate'
    ).required(),
    userId: Joi.string().required(),
    metadata: Joi.object({
      jobId: Joi.string(),
      applicationId: Joi.string(),
      searchQuery: Joi.string(),
      duration: Joi.number(),
      result: Joi.string()
    }).required(),
    timestamp: Joi.date().default(Date.now)
  }),

  aggregate: Joi.object({
    metricType: Joi.string().valid(
      'job_views',
      'application_rate',
      'search_metrics',
      'engagement_rate',
      'response_time',
      'placement_rate'
    ).required(),
    timeRange: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().greater(Joi.ref('start')).required()
    }),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    filters: Joi.object({
      userId: Joi.string(),
      jobId: Joi.string(),
      location: Joi.string(),
      category: Joi.string()
    })
  })
}; 