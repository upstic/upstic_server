import Joi from 'joi';

export const integrationSchema = {
  create: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid(
      'payment_gateway',
      'background_check',
      'document_verification',
      'calendar',
      'email_service',
      'sms_service',
      'analytics'
    ).required(),
    provider: Joi.string().required(),
    config: Joi.object({
      apiKey: Joi.string().required(),
      apiSecret: Joi.string(),
      baseUrl: Joi.string().uri(),
      webhookUrl: Joi.string().uri(),
      options: Joi.object()
    }).required(),
    status: Joi.string().valid('active', 'inactive', 'testing').default('testing'),
    metadata: Joi.object({
      description: Joi.string(),
      version: Joi.string(),
      lastSync: Joi.date()
    })
  }),

  update: Joi.object({
    config: Joi.object({
      apiKey: Joi.string(),
      apiSecret: Joi.string(),
      baseUrl: Joi.string().uri(),
      webhookUrl: Joi.string().uri(),
      options: Joi.object()
    }),
    status: Joi.string().valid('active', 'inactive', 'testing'),
    metadata: Joi.object({
      description: Joi.string(),
      version: Joi.string(),
      lastSync: Joi.date()
    })
  })
}; 