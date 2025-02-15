import Joi from 'joi';

export const clientSchema = {
  create: Joi.object({
    companyName: Joi.string().required(),
    industry: Joi.string().required(),
    contactPerson: Joi.object({
      name: Joi.string().required(),
      position: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
    }),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zipCode: Joi.string().required()
    }),
    billingInfo: Joi.object({
      taxId: Joi.string().required(),
      billingAddress: Joi.string().required(),
      paymentTerms: Joi.string().required()
    })
  }),

  update: Joi.object({
    companyName: Joi.string(),
    industry: Joi.string(),
    contactPerson: Joi.object({
      name: Joi.string(),
      position: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
    }),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string()
    }),
    billingInfo: Joi.object({
      taxId: Joi.string(),
      billingAddress: Joi.string(),
      paymentTerms: Joi.string()
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended')
  })
}; 