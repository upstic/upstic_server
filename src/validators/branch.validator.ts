import Joi from 'joi';

export const branchSchema = {
  create: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    location: Joi.object({
      address: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zipCode: Joi.string().required(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }).required(),
    contact: Joi.object({
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
      fax: Joi.string(),
      website: Joi.string().uri()
    }).required(),
    manager: Joi.object({
      userId: Joi.string().required(),
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
    }).required(),
    operatingHours: Joi.object({
      timezone: Joi.string().required(),
      weekdays: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
      }),
      weekend: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      holidays: Joi.array().items(
        Joi.object({
          date: Joi.date().required(),
          description: Joi.string().required()
        })
      )
    }).required(),
    services: Joi.array().items(
      Joi.string().valid('recruitment', 'training', 'payroll', 'compliance')
    ).required(),
    status: Joi.string().valid('active', 'inactive', 'maintenance').default('active')
  }),

  update: Joi.object({
    name: Joi.string(),
    location: Joi.object({
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      zipCode: Joi.string(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }),
    contact: Joi.object({
      email: Joi.string().email(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      fax: Joi.string(),
      website: Joi.string().uri()
    }),
    manager: Joi.object({
      userId: Joi.string(),
      name: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
    }),
    operatingHours: Joi.object({
      timezone: Joi.string(),
      weekdays: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      weekend: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      holidays: Joi.array().items(
        Joi.object({
          date: Joi.date(),
          description: Joi.string()
        })
      )
    }),
    services: Joi.array().items(
      Joi.string().valid('recruitment', 'training', 'payroll', 'compliance')
    ),
    status: Joi.string().valid('active', 'inactive', 'maintenance')
  }),

  assignManager: Joi.object({
    managerId: Joi.string().required()
  })
}; 