import Joi from 'joi';

export const payrollSchema = {
  generate: Joi.object({
    periodStart: Joi.date().required(),
    periodEnd: Joi.date().greater(Joi.ref('periodStart')).required(),
    workerId: Joi.string().optional()
  }),

  updateItem: Joi.object({
    amount: Joi.number().min(0).required(),
    description: Joi.string().required(),
    type: Joi.string().valid('salary', 'bonus', 'deduction', 'reimbursement').required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').optional()
  })
}; 