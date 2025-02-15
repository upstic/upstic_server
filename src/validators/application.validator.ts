import Joi from 'joi';

export const applicationSchema = {
  create: Joi.object({
    jobId: Joi.string().required(),
    coverLetter: Joi.string().min(100).max(2000).required(),
    expectedSalary: Joi.number().min(0).required(),
    availability: Joi.object({
      startDate: Joi.date().greater('now').required(),
      notice: Joi.number().min(0)
    }),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        url: Joi.string().uri().required(),
        type: Joi.string().valid('resume', 'portfolio', 'certificate', 'other').required()
      })
    ).max(5)
  }),

  update: Joi.object({
    status: Joi.string().valid('pending', 'reviewing', 'accepted', 'rejected').required(),
    feedback: Joi.string().min(10).max(1000).when('status', {
      is: 'rejected',
      then: Joi.required()
    })
  })
}; 