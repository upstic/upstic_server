import Joi from 'joi';

export const jobSchema = {
  create: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    requirements: Joi.array().items(Joi.string()).required(),
    skills: Joi.array().items(Joi.string()).required(),
    location: Joi.object({
      type: Joi.string().valid('onsite', 'remote', 'hybrid').required(),
      address: Joi.when('type', {
        is: Joi.valid('onsite', 'hybrid'),
        then: Joi.object({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          country: Joi.string().required(),
          zipCode: Joi.string().required()
        }).required()
      })
    }),
    shift: Joi.object({
      type: Joi.string().valid('day', 'evening', 'night', 'flexible').required(),
      startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      days: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ).required()
    }),
    rate: Joi.object({
      amount: Joi.number().min(0).required(),
      currency: Joi.string().required(),
      type: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').required()
    }),
    compliance: Joi.object({
      requiredDocuments: Joi.array().items(
        Joi.string().valid('id', 'work_permit', 'certification', 'background_check', 'drug_test')
      ),
      certifications: Joi.array().items(Joi.string())
    }),
    clientId: Joi.string().required(),
    branchId: Joi.string().required(),
    status: Joi.string().valid('draft', 'published', 'filled', 'cancelled').default('draft')
  }),

  update: Joi.object({
    status: Joi.string().valid('published', 'filled', 'cancelled'),
    rate: Joi.object({
      amount: Joi.number().min(0),
      currency: Joi.string(),
      type: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly')
    }),
    shift: Joi.object({
      type: Joi.string().valid('day', 'evening', 'night', 'flexible'),
      startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      days: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      )
    })
  })
}; 