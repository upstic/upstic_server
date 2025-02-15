import Joi from 'joi';

export const leaveSchema = {
  request: Joi.object({
    workerId: Joi.string().required(),
    type: Joi.string().valid(
      'annual',
      'sick',
      'personal',
      'maternity',
      'paternity',
      'bereavement',
      'unpaid'
    ).required(),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    reason: Joi.string().required(),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        url: Joi.string().uri().required(),
        type: Joi.string().valid('medical_certificate', 'other_document').required()
      })
    ),
    contactDetails: Joi.object({
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      email: Joi.string().email()
    })
  }),

  update: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'cancelled').required(),
    reviewedBy: Joi.string().required(),
    comments: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.required()
    }),
    approvalDetails: Joi.object({
      date: Joi.date(),
      conditions: Joi.string()
    })
  }),

  balance: Joi.object({
    workerId: Joi.string().required(),
    year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1),
    type: Joi.string().valid(
      'annual',
      'sick',
      'personal',
      'maternity',
      'paternity',
      'bereavement',
      'unpaid'
    )
  })
}; 