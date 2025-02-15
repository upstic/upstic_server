import Joi from 'joi';

export const trainingSchema = {
  create: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string().valid('online', 'classroom', 'workshop', 'seminar').required(),
    category: Joi.string().valid('technical', 'soft-skills', 'compliance', 'safety').required(),
    instructor: Joi.object({
      name: Joi.string().required(),
      qualification: Joi.string().required(),
      experience: Joi.number().min(0).required()
    }),
    schedule: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required(),
      sessions: Joi.array().items(
        Joi.object({
          date: Joi.date().required(),
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          duration: Joi.number().min(30).required() // duration in minutes
        })
      ).min(1)
    }),
    capacity: Joi.object({
      minimum: Joi.number().min(1).required(),
      maximum: Joi.number().greater(Joi.ref('minimum')).required()
    }),
    prerequisites: Joi.array().items(Joi.string()),
    materials: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('document', 'video', 'quiz', 'assignment').required(),
        url: Joi.string().uri()
      })
    ),
    assessment: Joi.object({
      method: Joi.string().valid('quiz', 'project', 'presentation', 'exam').required(),
      passingCriteria: Joi.string().required()
    })
  }),

  update: Joi.object({
    status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled'),
    schedule: Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date().greater(Joi.ref('startDate')),
      sessions: Joi.array().items(
        Joi.object({
          date: Joi.date(),
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          duration: Joi.number().min(30)
        })
      )
    }),
    materials: Joi.array().items(
      Joi.object({
        name: Joi.string(),
        type: Joi.string().valid('document', 'video', 'quiz', 'assignment'),
        url: Joi.string().uri()
      })
    )
  }),

  enrollment: Joi.object({
    workerId: Joi.string().required(),
    trainingId: Joi.string().required(),
    status: Joi.string().valid('enrolled', 'completed', 'dropped').required(),
    feedback: Joi.object({
      rating: Joi.number().min(1).max(5),
      comments: Joi.string()
    })
  })
}; 