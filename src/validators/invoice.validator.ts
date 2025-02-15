import Joi from 'joi';

export const invoiceSchema = {
  create: Joi.object({
    clientId: Joi.string().required(),
    items: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        rate: Joi.number().min(0).required(),
        amount: Joi.number().min(0).required()
      })
    ).min(1).required(),
    dueDate: Joi.date().greater('now').required(),
    terms: Joi.string().optional(),
    notes: Joi.string().optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'paid', 'cancelled').required(),
    paymentDate: Joi.date().when('status', {
      is: 'paid',
      then: Joi.required()
    }),
    notes: Joi.string()
  })
}; 