import Joi from 'joi';

export const websocketSchema = {
  connect: Joi.object({
    userId: Joi.string().required(),
    userType: Joi.string().valid('worker', 'client', 'recruiter').required(),
    deviceId: Joi.string().required(),
    platform: Joi.string().valid('web', 'mobile', 'tablet').required()
  }),

  message: Joi.object({
    type: Joi.string().valid(
      'chat',
      'notification',
      'status_update',
      'job_alert',
      'application_update'
    ).required(),
    content: Joi.object({
      messageId: Joi.string().required(),
      senderId: Joi.string().required(),
      recipientId: Joi.string().required(),
      body: Joi.string().required(),
      metadata: Joi.object({
        jobId: Joi.string(),
        applicationId: Joi.string(),
        status: Joi.string()
      })
    }).required(),
    timestamp: Joi.date().default(Date.now)
  }),

  subscription: Joi.object({
    channels: Joi.array().items(
      Joi.string().valid(
        'job_updates',
        'chat_messages',
        'notifications',
        'system_alerts'
      )
    ).required(),
    userId: Joi.string().required()
  })
}; 