import Joi from 'joi';

export const workerSchema = {
  create: Joi.object({
    userId: Joi.string().required(),
    skills: Joi.array().items(Joi.string()).min(1).required(),
    experience: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        company: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')),
        current: Joi.boolean(),
        description: Joi.string()
      })
    ),
    education: Joi.array().items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        field: Joi.string().required(),
        graduationYear: Joi.number().integer().min(1900).max(new Date().getFullYear()),
        grade: Joi.string()
      })
    ),
    certifications: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        issuingOrganization: Joi.string().required(),
        issueDate: Joi.date().required(),
        expiryDate: Joi.date().greater(Joi.ref('issueDate')),
        credentialId: Joi.string()
      })
    ),
    availability: Joi.object({
      status: Joi.string().valid('available', 'unavailable', 'partially_available').required(),
      hours: Joi.object({
        min: Joi.number().min(0).max(168),
        max: Joi.number().min(Joi.ref('min')).max(168)
      }),
      preferredShift: Joi.array().items(
        Joi.string().valid('morning', 'afternoon', 'evening', 'night')
      )
    })
  }),

  update: Joi.object({
    skills: Joi.array().items(Joi.string()),
    experience: Joi.array().items(
      Joi.object({
        title: Joi.string(),
        company: Joi.string(),
        startDate: Joi.date(),
        endDate: Joi.date().greater(Joi.ref('startDate')),
        current: Joi.boolean(),
        description: Joi.string()
      })
    ),
    education: Joi.array().items(
      Joi.object({
        degree: Joi.string(),
        institution: Joi.string(),
        field: Joi.string(),
        graduationYear: Joi.number().integer().min(1900).max(new Date().getFullYear()),
        grade: Joi.string()
      })
    ),
    certifications: Joi.array().items(
      Joi.object({
        name: Joi.string(),
        issuingOrganization: Joi.string(),
        issueDate: Joi.date(),
        expiryDate: Joi.date().greater(Joi.ref('issueDate')),
        credentialId: Joi.string()
      })
    ),
    availability: Joi.object({
      status: Joi.string().valid('available', 'unavailable', 'partially_available'),
      hours: Joi.object({
        min: Joi.number().min(0).max(168),
        max: Joi.number().min(Joi.ref('min')).max(168)
      }),
      preferredShift: Joi.array().items(
        Joi.string().valid('morning', 'afternoon', 'evening', 'night')
      )
    })
  })
}; 