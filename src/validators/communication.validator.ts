import Joi from 'joi';

export const communicationSchema = {
  sendEmail: Joi.object({
    recipients: Joi.array().items(
      Joi.string().email()
    ).min(1).required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
    template: Joi.string().valid('job_alert', 'interview_invitation', 'offer_letter', 'compliance_reminder'),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.string().required(),
        contentType: Joi.string().required()
      })
    ),
    metadata: Joi.object({
      jobId: Joi.string(),
      candidateId: Joi.string(),
      clientId: Joi.string()
    })
  }),

  sendBulkNotification: Joi.object({
    userType: Joi.string().valid('workers', 'clients', 'recruiters').required(),
    filters: Joi.object({
      skills: Joi.array().items(Joi.string()),
      location: Joi.string(),
      availability: Joi.string(),
      jobType: Joi.string()
    }),
    notification: Joi.object({
      title: Joi.string().required(),
      body: Joi.string().required(),
      type: Joi.string().valid('job_alert', 'system_update', 'compliance', 'general').required(),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
      action: Joi.object({
        type: Joi.string().valid('view_job', 'update_profile', 'view_timesheet', 'other'),
        link: Joi.string().uri()
      })
    })
  })
}; 