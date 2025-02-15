import Joi from 'joi';

export const profileSchema = {
  update: Joi.object({
    bio: Joi.string().max(500),
    skills: Joi.array().items(Joi.string()).min(1),
    experience: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        company: Joi.string().required(),
        location: Joi.string(),
        startDate: Joi.date().required(),
        endDate: Joi.date().min(Joi.ref('startDate')),
        current: Joi.boolean(),
        description: Joi.string().max(1000)
      })
    ),
    education: Joi.array().items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        field: Joi.string().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().min(Joi.ref('startDate')),
        current: Joi.boolean(),
        grade: Joi.string()
      })
    ),
    socialLinks: Joi.object({
      linkedin: Joi.string().uri(),
      github: Joi.string().uri(),
      portfolio: Joi.string().uri(),
      twitter: Joi.string().uri()
    }),
    preferences: Joi.object({
      jobTypes: Joi.array().items(
        Joi.string().valid('full-time', 'part-time', 'contract', 'freelance')
      ),
      locations: Joi.array().items(Joi.string()),
      remoteWork: Joi.boolean(),
      salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().greater(Joi.ref('min'))
      })
    })
  })
}; 